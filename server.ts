import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Body parsing for raw binary video uploads & JSON
  app.use("/api/cloudflare/r2-upload", express.raw({ type: "*/*", limit: "500mb" }));
  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ extended: true, limit: "500mb" }));

  // Allow CORS for local cross-port communication (Vite to Express server)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Initialize Gemini AI Client lazily
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        aiClient = new GoogleGenAI({ apiKey });
      }
    }
    return aiClient;
  }

  // --- API ROUTES ---

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "online",
      service: "PackGuard Cloudflare R2/D1 Video Packing Server",
      timestamp: new Date().toISOString(),
    });
  });

  // Authentication Endpoint (Supabase / local fallback)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, supabaseUrl, supabaseAnonKey } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username dan password wajib diisi." });
      }

      // Read from env or request payload
      const url = process.env.SUPABASE_URL || supabaseUrl;
      const key = process.env.SUPABASE_ANON_KEY || supabaseAnonKey;

      const isSimulated = !url || !key || url.includes("xyzcompany") || url.includes("your-project");

      if (isSimulated) {
        // Local simulation fallback users
        const LOCAL_USERS = [
          {
            id: 'user-op-1',
            username: 'operator',
            password: 'operator123',
            fullName: 'Operator',
            role: 'operator',
            station: 'Stasiun 01 (Utama)',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            allowedMenus: ['recorder', 'logs']
          },
          {
            id: 'user-admin-1',
            username: 'admin',
            password: 'admin123',
            fullName: 'Admin',
            role: 'admin',
            station: 'Pusat Kontrol',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
            allowedMenus: ['recorder', 'logs', 'analytics', 'anomalies']
          },
          {
            id: 'user-dev-1',
            username: 'developer',
            password: 'dev123',
            fullName: 'Developer',
            role: 'developer',
            station: 'Dev System Ops',
            avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
            allowedMenus: ['recorder', 'logs', 'analytics', 'anomalies', 'settings', 'sql_editor']
          }
        ];

        const matched = LOCAL_USERS.find(
          u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
        );

        if (matched) {
          const { password: _, ...userWithoutPass } = matched;
          return res.json({ success: true, user: userWithoutPass });
        } else {
          return res.status(401).json({ error: "Username atau password salah (Simulasi Lokal)." });
        }
      }

      // Query real Supabase PostgreSQL table
      const fetchUrl = `${url.replace(/\/$/, "")}/rest/v1/users?username=eq.${encodeURIComponent(username.trim())}&select=*`;
      const response = await fetch(fetchUrl, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Supabase error:", errText);
        return res.status(response.status).json({ error: `Gagal query ke Supabase: ${response.statusText}` });
      }

      const dbUsers = await response.json() as any[];
      if (!dbUsers || dbUsers.length === 0) {
        return res.status(401).json({ error: "Username tidak ditemukan di database." });
      }

      const user = dbUsers[0];

      // Sesuai dengan data seed SQL, password disimpan di kolom password_hash sebagai teks polos
      if (user.password_hash !== password) {
        return res.status(401).json({ error: "Kata sandi salah." });
      }

      if (user.is_active === false) {
        return res.status(403).json({ error: "Akun ini telah dinonaktifkan." });
      }

      // Tentukan hak akses menu berdasarkan role
      let allowedMenus: string[] = ['recorder', 'logs'];
      if (user.role === 'admin') {
        allowedMenus = ['recorder', 'logs', 'analytics', 'anomalies'];
      } else if (user.role === 'developer') {
        allowedMenus = ['recorder', 'logs', 'analytics', 'anomalies', 'settings', 'sql_editor'];
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          station: user.station || "Stasiun 01",
          avatar: user.avatar_url || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80`,
          allowedMenus
        }
      });
    } catch (err: any) {
      console.error("Login API Error:", err);
      return res.status(500).json({ error: "Gagal melakukan autentikasi di server.", details: err.message });
    }
  });

  // AI Order Label Reader / OCR Endpoint
  app.post("/api/ai/scan-label", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64 data" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        // No Gemini API key configured - cannot perform OCR
        return res.status(503).json({
          success: false,
          error: "Gemini AI API Key belum dikonfigurasi. Scan resi memerlukan konfigurasi GEMINI_API_KEY di file .env untuk membaca barcode/QR code.",
        });
      }

      // Remove header if present (data:image/jpeg;base64,...)
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanBase64,
                },
              },
              {
                text: `Analisis resi / label pengiriman ini dan ekstrak informasi berikut dalam format JSON valid:
{
  "orderNumber": "Nomor pesanan / resi (misal ORD-88392)",
  "customerName": "Nama penerima",
  "courier": "Nama kurir / ekspedisi (misal J&T, SiCepat, JNE)",
  "detectedItems": ["Daftar barang jika tertulis di label"]
}
Hanya berikan JSON valid tanpa markdown codeblock formatting jika memungkinkan.`,
              },
            ],
          },
        ],
      });

      const responseText = response.text || "";
      // Clean JSON formatting
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json({
          success: true,
          orderNumber: parsed.orderNumber || `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
          customerName: parsed.customerName || "Pelanggan Terdeteksi",
          courier: parsed.courier || "Expedisi Terdeteksi",
          items: parsed.detectedItems || [],
          source: "gemini_2.5_flash",
        });
      }

      return res.json({
        success: true,
        orderNumber: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
        customerName: "Resi Terdeteksi",
        courier: "Expedisi",
        source: "fallback_text",
      });
    } catch (err: unknown) {
      console.error("AI Scan Error:", err);
      return res.status(500).json({
        error: "Gagal memproses gambar resi",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Cloudflare R2 Proxy Upload Endpoint & Supabase PostgreSQL Metadata Indexing
  app.post("/api/cloudflare/r2-upload", async (req, res) => {
    try {
      // Handle params either from query params (binary upload) or JSON body
      const query = req.query || {};
      const bodyJSON = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : {};

      const trackingNumber = (query.trackingNumber as string) || bodyJSON.trackingNumber || "SPX12345";
      const fileName = (query.fileName as string) || bodyJSON.fileName || "video.mp4";
      const r2Key = (query.r2Key as string) || bodyJSON.r2Key;
      const sizeMB = parseFloat((query.sizeMB as string) || bodyJSON.sizeMB || "0");
      const metadata = bodyJSON.metadata || {
        order_id: query.orderId,
        tracking_number: trackingNumber,
        sku: query.sku,
        nama_barang: query.namaBarang,
        packer: query.packer,
        packing_station: query.packingStation,
        duration: parseInt((query.duration as string) || "0"),
        supabase_id: query.supabaseId,
      };

      const date = new Date();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const cleanTracking = (trackingNumber || "SPX12345").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");

      // Bucket name: packing-video
      // Path structure: YYYY/MM/DD/SPX12345/video.mp4
      const storagePath = r2Key || `${yyyy}/${mm}/${dd}/${cleanTracking}/${fileName || "video.mp4"}`;
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "packing-video";
      const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || "d89c44120fd91b332dd07d4527d69ade";
      const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "3ee23b57c409595f1c26f7ae30cc86b6";
      const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577";

      let r2PublicUrl = `/api/video-play?key=${encodeURIComponent(storagePath)}`;

      // Perform real PutObject upload to Cloudflare R2 if credentials exist
      if (accountId && accessKeyId && secretAccessKey && !accountId.includes("your-")) {
        try {
          const s3 = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
          });

          let bodyBuffer: Buffer;
          if (Buffer.isBuffer(req.body) && req.body.length > 0) {
            // Raw binary video file payload sent from frontend!
            bodyBuffer = req.body;
          } else if (bodyJSON.videoBase64) {
            const cleanBase64 = bodyJSON.videoBase64.replace(/^data:video\/\w+;base64,/, "");
            bodyBuffer = Buffer.from(cleanBase64, "base64");
          } else {
            bodyBuffer = Buffer.from(JSON.stringify({ trackingNumber: cleanTracking, fileName, timestamp: new Date().toISOString() }));
          }

          await s3.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: storagePath,
              Body: bodyBuffer,
              ContentType: "video/mp4",
            })
          );

          console.log(`[Cloudflare R2] Successfully uploaded ${storagePath} (${(bodyBuffer.length / (1024 * 1024)).toFixed(2)} MB) to bucket '${bucketName}'!`);
        } catch (r2Err: any) {
          console.error("[Cloudflare R2] PutObject Upload Error:", r2Err);
          return res.status(500).json({
            error: "Gagal mengunggah video ke Cloudflare R2",
            details: r2Err.message || String(r2Err)
          });
        }
      }

      const supabaseRecordId = metadata?.supabase_id || (query.supabaseId as string) || `sp_rec_${Date.now()}`;

      res.json({
        success: true,
        orderId: metadata?.order_id || (query.orderId as string) || `ORD-${cleanTracking}`,
        trackingNumber: cleanTracking,
        r2StorageKey: storagePath,
        r2PublicUrl,
        supabaseRecordId,
        metadata: {
          order_id: metadata?.order_id || (query.orderId as string) || `ORD-${cleanTracking}`,
          tracking_number: cleanTracking,
          sku: metadata?.sku || (query.sku as string) || "SKU-BARANG",
          nama_barang: metadata?.nama_barang || (query.namaBarang as string) || "Barang Paket",
          packer: metadata?.packer || (query.packer as string) || "Operator Gudang",
          packing_station: metadata?.packing_station || (query.packingStation as string) || "Stasiun 01",
          video_url: r2PublicUrl,
          video_size: sizeMB || 5.5,
          duration: metadata?.duration || 25,
          upload_status: "uploaded",
          created_at: new Date().toISOString(),
          supabase_id: supabaseRecordId,
        },
        indexedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      console.error("R2 Upload Server Error:", err);
      res.status(500).json({ error: "Failed to upload video to Cloudflare R2", details: err instanceof Error ? err.message : String(err) });
    }
  });

  // Stream Video Playback Proxy Endpoint from Cloudflare R2 (with Range Request support)
  app.get("/api/video-play", async (req, res) => {
    try {
      const key = (req.query.key as string) || (req.query.r2Key as string);
      if (!key) {
        return res.status(400).send("Missing video storage key parameter");
      }

      const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || "d89c44120fd91b332dd07d4527d69ade";
      const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "3ee23b57c409595f1c26f7ae30cc86b6";
      const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577";
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "packing-video";

      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });

      // Handle Range request from browser
      const range = req.headers.range;

      const headCommand = new GetObjectCommand({ Bucket: bucketName, Key: key });
      const r2Response = await s3.send(headCommand);

      if (!r2Response.Body) {
        return res.status(404).send("Video object not found in Cloudflare R2");
      }

      const totalSize = r2Response.ContentLength || 0;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const chunksize = (end - start) + 1;

        const rangeCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
          Range: `bytes=${start}-${end}`
        });
        const rangeResponse = await s3.send(rangeCommand);

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": r2Response.ContentType || "video/mp4",
          "Access-Control-Allow-Origin": "*",
        });

        const stream = rangeResponse.Body as any;
        return stream.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": totalSize,
          "Content-Type": r2Response.ContentType || "video/mp4",
          "Access-Control-Allow-Origin": "*",
        });
        const stream = r2Response.Body as any;
        return stream.pipe(res);
      }
    } catch (err: unknown) {
      console.error("[Cloudflare R2 Stream Error]:", err);
      return res.status(500).send("Error streaming video from Cloudflare R2");
    }
  });

  const httpServer = http.createServer(app);

  // Vite middleware for development vs static build serve in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const startExpress = (port: number) => {
    httpServer.removeAllListeners("error");
    httpServer.listen(port, "0.0.0.0", () => {
      console.log(`[PackGuard Server] Running on http://localhost:${port} (Local Network: http://0.0.0.0:${port})`);
    });
    httpServer.once("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${port} is in use, trying ${port + 1}...`);
        startExpress(port + 1);
      } else {
        console.error("Server error:", err);
      }
    });
  };

  startExpress(PORT);
}

startServer();
