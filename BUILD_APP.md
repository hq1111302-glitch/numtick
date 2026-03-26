# NumTick 앱 빌드 가이드

HTML5 게임을 Android/iOS 앱으로 빌드하는 방법입니다.

## 사전 준비

### Android
1. [Android Studio](https://developer.android.com/studio) 설치
2. Android SDK 설치 (Android Studio 설치 시 자동)
3. Node.js 18+ 설치

### iOS (Mac만 가능)
1. Xcode 설치 (App Store에서)
2. CocoaPods 설치: `sudo gem install cocoapods`
3. Node.js 18+ 설치

## 빌드 방법

### 1단계: 의존성 설치
```bash
npm install
```

### 2단계: Android 빌드

```bash
# 웹 파일 복사 + Android 프로젝트 동기화
npm run sync:android

# Android Studio에서 열기
npm run open:android
```

Android Studio가 열리면:
1. Gradle 동기화 완료 대기
2. 상단 메뉴 **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. `android/app/build/outputs/apk/debug/app-debug.apk` 생성됨

또는 커맨드라인으로:
```bash
npm run build:android
```

### 3단계: iOS 빌드 (Mac만 가능)

```bash
# iOS 플랫폼 추가 (최초 1회)
npx cap add ios

# 웹 파일 복사 + iOS 프로젝트 동기화
npm run sync:ios

# Xcode에서 열기
npm run open:ios
```

Xcode에서:
1. Signing & Capabilities에서 Team 설정
2. 빌드 타겟(iPhone 시뮬레이터 또는 실기기) 선택
3. ▶ 버튼으로 빌드 및 실행

## 코드 수정 후 재빌드

게임 코드(js/, css/, index.html)를 수정한 뒤:
```bash
npm run sync:android   # Android
npm run sync:ios       # iOS
```
이후 Android Studio/Xcode에서 다시 빌드하면 됩니다.

## 앱 스토어 출시

### Google Play Store
1. Android Studio에서 **Build** → **Generate Signed Bundle / APK**
2. 키스토어 생성 (최초 1회)
3. AAB(Android App Bundle) 생성
4. [Google Play Console](https://play.google.com/console) 에서 앱 등록 (개발자 등록비 $25)

### Apple App Store
1. [Apple Developer Program](https://developer.apple.com/programs/) 가입 (연 $99)
2. Xcode에서 Archive → Distribute App
3. App Store Connect에서 앱 정보 입력 후 제출

## 전체 구조
```
numtick/
├── index.html          ← 게임 원본 (브라우저용)
├── css/
├── js/
├── www/                ← 빌드 시 자동 생성 (앱에 들어가는 웹 파일)
├── android/            ← Android 네이티브 프로젝트
├── capacitor.config.json
└── package.json
```
