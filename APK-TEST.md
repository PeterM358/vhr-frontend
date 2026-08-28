# APK тест на телефон (Veversal)

## 2 файла — и това е всичко

### 1) `.env.local` (вече го имаш)
**За какво:** всички ключове (Google, Maps, Firebase base64, и т.н.)  
**Попълваш веднъж.** Не го commit-ваш.

### 2) `.env.staging` (вече го имаш)
**За какво:** само **къде е beta сървърът** — 3 реда:

```
EXPO_PUBLIC_API_BASE_URL=https://api-beta.veversal.com
EXPO_PUBLIC_WS_BASE_URL=wss://api-beta.veversal.com
EXPO_PUBLIC_WS_ENABLED=true
```

OAuth/Maps **не** трябва да копираш тук — build-ът ги взима автоматично от `.env.local`.

---

## Команди (запомни 2)

Телефонът на USB, USB debugging включен.

```bash
cd ~/vhr-frontend

# Изчисти стари APK (Mac + телефон /sdcard/veversal)
npm run apk:clean

# Нов build (~15–20 мин) — име с версия, напр. veversal-1.0.1-2-beta-20260828-1510.apk
npm run apk:beta

# Копирай на телефона в /sdcard/veversal/ (без install)
npm run apk:push
```

APK на Mac: `dist/apk/LATEST.apk` (symlink към последния build)  
На телефона: `/sdcard/veversal/veversal-1.0.1-2-beta-....apk`

**Важно:** ако launcher-ът е стар — **деинсталирай** старото Veversal преди install на новия APK.

---

## Кога какво

| Ситуация | Команда |
|----------|---------|
| Нов APK с beta данни | `npm run apk:beta` |
| APK вече е build-нат, само на телефона | `npm run apk:install` |
| Само JS промени (без APK) — по-късно | dev client + `npm run start:mobile:staging` |

---

## Защо предишният APK беше празен

Build-ът без staging env беше вързан към `192.168.0.104` (local Mac).  
`npm run apk:beta` винаги ползва **api-beta.veversal.com**.
