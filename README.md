# Anime Card Arena — requirements.txtsiz

Ishga tushirish uchun asosiy fayl: `app.py`.

`requirements.txt` yo‘q. `app.py` boshlanganda `aiogram==3.30.0` o‘rnatilganligini tekshiradi; yo‘q bo‘lsa `pip` orqali bir marta o‘rnatishga urinadi. Hosting internet orqali pip o‘rnatishga ruxsat bermasa, paketni hostingning o‘z dependency sozlamasidan o‘rnatish kerak bo‘ladi.

## Sozlash
`.env.example` ni `.env` qilib ko‘chiring yoki hosting Variables/Environment bo‘limiga qiymatlarni kiriting:

`BOT_TOKEN` — Telegram bot tokeni
`WEBAPP_URL` — HTTPS Web App manzili, `/app` bilan
`ADMIN_IDS` — admin Telegram ID(lar)i, vergul bilan
`PORT` — odatda hosting bergan port

## Ishga tushirish
`python app.py`

Web App bot ichidan `🎴 O‘yinni ochish` tugmasi orqali ochiladi.

## Tizim
- Epic / Legendary / Mighty kartalar
- karta kitobi: har rarity alohida sahifa
- Afsunlar kitobi
- Coin va Chakra
- karta sotib olish
- Chakra sotib olish
- 5 ta duplicate bilan upgrade
- Arena: 5 karta vs 5 karta
- har yurish 60 soniya
- karta rarity va poweriga yaqin raqib
- server tomonida jang hisoblash
- pul kiritish: summa → to‘lov → screenshot → admin tasdiq/rad
- pul chiqarish: summa → rekvizit → admin tasdiq/rad
- Market asosiy Telegram bot ichida
- admin panel: rekvizitlar, Coin paketlari, pending deposit/withdrawal

## Rasmlar
Web App lokal SVG assetlardan foydalanadi. UI showcase ham lokal asset sifatida berilgan.
