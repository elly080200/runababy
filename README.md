# Runababy SSR 部署說明

## 資料夾結構

```
你的專案/
├── public/
│   └── index.html          ← 你原本的網站檔案放這裡
├── functions/
│   ├── index.js            ← Cloud Function（已完成）
│   └── package.json        ← 相依套件（已完成）
├── firebase.json           ← Hosting + Function 設定（已完成）
└── .firebaserc             ← 專案綁定（已完成）
```

---

## 部署步驟

### 1. 安裝 Firebase CLI（只需做一次）

```bash
npm install -g firebase-tools
```

### 2. 登入 Firebase

```bash
firebase login
```

### 3. 把你的 index.html 放到 public 資料夾

```bash
mkdir public
# 把 index.html 複製進去
cp 你的index.html路徑 public/index.html
```

### 4. 安裝 Function 套件

```bash
cd functions
npm install
cd ..
```

### 5. 部署

```bash
firebase deploy
```

或分開部署：

```bash
firebase deploy --only hosting   # 只部署網站
firebase deploy --only functions # 只部署 Function
```

---

## 部署後效果

| 網址 | 處理方式 |
|------|----------|
| `runababy-ee77d.web.app/` | 靜態 HTML（原本速度） |
| `runababy-ee77d.web.app/products/商品slug` | Cloud Function，動態塞入商品 OG |

### LINE / FB 分享商品時的變化

**之前：**
- 標題：Runababy 韓國童裝代購
- 圖片：首頁圖

**之後：**
- 標題：商品名稱 | Runababy 韓國童裝代購
- 圖片：該商品第一張照片
- 描述：商品介紹前 100 字

---

## 注意事項

- Cloud Function 第一次冷啟動約 1-2 秒，但爬蟲不在意速度
- 一般使用者點商品連結還是走前端 JS，速度不受影響
- 每天上新商品不需要任何額外操作，Function 每次都即時從 Firestore 拉最新資料
- **免費方案限制**：Firebase Spark（免費）不支援 Cloud Functions，需升級到 Blaze（用多少付多少），商品頁 Function 每次呼叫費用極低（約 $0.0000004 美元/次）

---

## 確認部署成功

部署後在瀏覽器開 DevTools → Network，進入任何商品頁，
確認 Response Header 有出現來自 Function 的內容，
或直接用 LINE 分享商品連結，看預覽圖是否變成該商品圖片。
