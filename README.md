# אפליקציית ניקוד לילדות - iPad PWA (ללא שרת נתונים)

האפליקציה רצה כ־PWA ושומרת הכל מקומית על המכשיר (IndexedDB).

## מה זה אומר בפועל
- אין צורך ב־Backend
- אין צורך ב־SQLite או שרת מק כדי להשתמש יומיומית
- כל הדאטה נשמר מקומית על ה־iPad
- גיבוי/שחזור דרך JSON מתוך אזור הורה

## הרצה מקומית לפיתוח (על Mac)
```bash
cd "/Users/itamar/Documents/New project"
python3 -m http.server 8080
```
ואז לפתוח:
- `http://localhost:8080`

## התקנה על iPad כאפליקציה (ללא TestFlight)
1. תעלה את קבצי הפרויקט ל־GitHub Repo.
2. תפעיל GitHub Pages (חינם) על branch `main`.
3. תפתח ב־Safari ב־iPad את כתובת ה־Pages.
4. Share -> Add to Home Screen.
5. מהרגע שהאפליקציה נפתחה והקבצים בקאש, השימוש היומי הוא מקומי על המכשיר.

## אזור הורה
- PIN ברירת מחדל: `1234`
- שמות פרופילים: `סופיה` ו־`אנה`

## קבצים מרכזיים
- `index.html` - מבנה מסכים
- `styles.css` - עיצוב RTL
- `app.js` - לוגיקת מוצר + אחסון מקומי
- `sw.js` - Service Worker לאופליין
- `manifest.json` - התקנה כ־PWA
