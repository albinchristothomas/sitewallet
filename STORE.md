# RigVise on the App Store and Google Play

The native apps are thin shells (Capacitor) that load the live site in a
native WebView. Every web deploy reaches the apps instantly; the stores only
see a new build when the shell itself changes (icon, permissions, plugins).

    capacitor.config.ts      app id, name, server URL, plugins
    android/                 Android Studio project (commit it)
    ios/                     Xcode project (commit it)
    resources/               icon + splash sources; regenerate with
                             `npx @capacitor/assets generate`
    native/www/index.html    offline fallback shell only

Store-required features already in the web app:
- Privacy policy: /privacy (public). Link it in both store listings.
- Account deletion: Profile → Delete my account (Apple 5.1.1(v), Play policy).
- Support contact: /help and hello@<domain>.
- Camera permission strings: AndroidManifest.xml + ios/App/App/Info.plist.

## One-time accounts (you)

| Store        | Account                         | Cost          |
|--------------|---------------------------------|---------------|
| Google Play  | play.google.com/console         | US$25 once    |
| Apple        | developer.apple.com (Individual or Organization) | US$99 / year |

Apple's review of the Organization type can take 1–2 weeks; Individual is
same-day but the developer name on the listing is your legal name.

## Point the shell at the final domain

When rigvise.com is live:

    CAP_SERVER_URL=https://rigvise.com npx cap sync

(or edit the default in capacitor.config.ts). Both domains are already in
`allowNavigation`.

## Android — build and publish (Windows is fine)

1. Install Android Studio (bundles the JDK and SDK).
2. `npx cap open android` → let Gradle sync.
3. Build → Generate Signed Bundle → create a keystore. **Back the keystore up
   somewhere safe** — losing it means never updating the app again. Play App
   Signing is on by default; keep it.
4. Play Console → Create app → upload the `.aab`. Fill:
   - App name RigVise, category Business, contains ads: no
   - Privacy policy URL: https://<domain>/privacy
   - Data safety form: collects name, email, phone (optional), photos
     (user-provided), app activity (check-ins); shared with none; encrypted in
     transit; deletion available in-app.
   - Permissions declaration for CAMERA: "Scans worker QR codes at the gate
     and photographs safety tickets."
   - Store listing needs: 512×512 icon (`resources/icon.png` scaled),
     1024×500 feature graphic, 2–8 phone screenshots.
5. Internal testing track first (instant, up to 100 testers by email) —
   that is the right place for the 40-worker pilot. Production review is
   usually 1–3 days.

## iOS — build and publish (needs a Mac with Xcode)

There is no way around the Mac: Apple's toolchain only runs on macOS. Options:
borrow one for an afternoon, use a cloud Mac (MacStadium, MacinCloud — a few
dollars an hour), or a CI service with macOS runners (Codemagic has a free
tier and a Capacitor preset).

1. On the Mac: `git clone`, `npm i`, `npx cap sync ios`, `npx cap open ios`.
2. Xcode → Signing & Capabilities → pick your team; bundle id `com.rigvise.app`.
3. Product → Archive → Distribute → App Store Connect.
4. App Store Connect → new app:
   - Privacy policy URL, support URL (https://<domain>/help)
   - App Privacy questionnaire (same answers as Play's data safety)
   - Screenshots: 6.7" and 6.5" iPhone sets (Xcode simulator captures work)
   - Review notes: give Apple a **demo login**. Create a worker account and a
     medic account on a demo site, and paste their sign-in emails plus a
     note that codes go to those inboxes — or, better, ask me to add a
     reviewer-only password login gated to those two accounts.
5. TestFlight for the pilot (instant after processing); App Review for public
   release, typically 1–2 days. Camera-use apps and thin-wrapper concerns:
   the app has native permissions, offline handling, and platform-appropriate
   UI, which is what Guideline 4.2 looks for.

## What changed in the web app for the shells

- `lib/native.ts` — `isNativeApp()` so pages can hide browser-only advice
  (for example "Add to Home Screen").
- Sign-in already uses 6-digit codes, which work inside a WebView where
  magic links would open the phone's browser instead.
- Camera access is `getUserMedia` (QR) and `<input capture>` (photos); both
  work in the shells with the permissions declared above.

## Not done yet (needs you or a Mac)

- Signing keystore / Apple team: only you can own these.
- Store screenshots and the feature graphic.
- Deep links (assetlinks.json / apple-app-site-association) — optional; only
  needed if you want https://rigvise.com/... links to open the app.
