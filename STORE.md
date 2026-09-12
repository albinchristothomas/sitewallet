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

## Android — build and publish (tooling already installed on this PC)

JDK 21 and the Android SDK live in `D:\Android`; the upload keystore is
`D:\Android\keys
igvise-upload.keystore` with its passwords beside it.
**Back that folder up.** Losing the keystore means never updating the app.

1. Build from the repo root, no Android Studio needed:

       set JAVA_HOME=D:\Android\jdk\jdk-21.0.12.1+1
       cd android
       gradlew bundleRelease assembleRelease

2. Outputs: `android/app/build/outputs/bundle/release/app-release.aab` for
   Play, and `android/app/build/outputs/apk/release/app-release.apk` to
   install directly on any Android phone.
3. Play App Signing is on by default in the Play Console; keep it.
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

## iOS — build and publish with NO Mac (Codemagic)

Apple's toolchain only runs on macOS, so the build runs on Codemagic's Mac
machines instead of yours. `codemagic.yaml` in the repo already defines the
whole pipeline: install, sync, sign, build, upload to TestFlight. The free
tier covers roughly 10 iOS builds a month.

One-time setup (about 20 minutes, all in a browser):

1. **Apple Developer** account active (developer.apple.com, US$99/yr).
2. **App Store Connect** (appstoreconnect.apple.com):
   - Users and Access → Integrations → App Store Connect API → Generate API
     Key. Name "codemagic", access **App Manager**. Download the `.p8` file
     right away (Apple offers it once) and note the Issuer ID + Key ID.
   - Apps → + → New App: iOS, name RigVise, bundle id `com.rigvise.app`
     (register the identifier first at developer.apple.com → Identifiers if
     it is not in the list), SKU `rigvise`.
3. **Codemagic** (codemagic.io): sign in with GitHub, add the `sitewallet`
   repository, pick "codemagic.yaml" as the configuration.
   - Team settings → Integrations → App Store Connect → add the `.p8`, Issuer
     ID and Key ID. Name the integration exactly **rigvise**.
   - Optional: environment variable `APP_STORE_APPLE_ID` = the numeric Apple
     ID under the app's General → App Information, in a variable group named
     **rigvise**. Without it, build numbers still count up.
4. Start the **RigVise iOS → TestFlight** workflow. The first run takes about
   15 minutes; the build lands in TestFlight automatically.
5. TestFlight → add testers by email. Workers install the TestFlight app and
   tap the invite, same day.
6. App Store release: App Store Connect → the build → fill the listing
   (privacy policy URL, support URL, screenshots, review notes with a demo
   login) → Submit for Review. Typically 1–2 days.

Android can also be built in the cloud with the `android-play` workflow if
you upload `D:/Android/keys/rigvise-upload.keystore` under Codemagic → Code
signing identities → Android keystores, reference name **rigvise_upload**.

## What changed in the web app for the shells

- `lib/native.ts` — `isNativeApp()` so pages can hide browser-only advice
  (for example "Add to Home Screen").
- Sign-in already uses 6-digit codes, which work inside a WebView where
  magic links would open the phone's browser instead.
- Camera access is `getUserMedia` (QR) and `<input capture>` (photos); both
  work in the shells with the permissions declared above.

## Not done yet (needs you)

- Apple Developer + Play Console accounts, and the App Store Connect API key for Codemagic: only you can own these. The Android upload keystore already exists in D:\Android\keys.
- Store screenshots. (The 512 icon and 1024x500 feature graphic are ready in D:\Android\out\play-assets.)
- Deep links (assetlinks.json / apple-app-site-association) — optional; only
  needed if you want https://rigvise.com/... links to open the app.
