# 🚀 Railway.app 배포 가이드

이 가이드는 PDF/EPUB Reader를 Railway.app에 배포하는 방법을 단계별로 설명합니다.

## 📋 사전 준비

1. **Railway 계정 생성**
   - [Railway.app](https://railway.app) 접속
   - GitHub 계정으로 로그인 (권장)

2. **GitHub 저장소**
   - 이 프로젝트가 GitHub에 푸시되어 있어야 합니다
   - 브랜치: `claude/pdf-reader-translator-011CUpbHwwWRm27xQSEgmgEh`

## 🎯 배포 단계

### 1단계: Railway 프로젝트 생성

1. Railway 대시보드에서 **"New Project"** 클릭
2. **"Deploy from GitHub repo"** 선택
3. GitHub 저장소 연결 (처음이면 권한 승인 필요)
4. `obmakesomething/002` 저장소 선택
5. 브랜치 선택: `claude/pdf-reader-translator-011CUpbHwwWRm27xQSEgmgEh`

### 2단계: 환경 변수 설정

Railway 대시보드에서 **"Variables"** 탭으로 이동 후 다음 변수들을 추가:

```bash
# 필수 환경 변수
SESSION_SECRET=your-random-secret-key-here-change-this

# 선택 환경 변수 (Railway가 자동 설정)
PORT=자동으로 설정됨
NODE_ENV=production
```

**SESSION_SECRET 생성 방법:**
```bash
# 방법 1: 브라우저 콘솔에서
crypto.randomBytes(32).toString('hex')

# 방법 2: 온라인 생성기
https://randomkeygen.com/
```

### 3단계: 배포 시작

1. 환경 변수 저장 후 **자동으로 배포 시작**
2. "Deployments" 탭에서 배포 진행 상황 확인
3. 빌드 로그 확인:
   ```
   ✓ Dependencies installed
   ✓ SQLite database initialized
   ✓ Server starting...
   ✓ Deployment successful
   ```

### 4단계: 도메인 확인

1. 배포 완료 후 **"Settings"** → **"Domains"** 확인
2. Railway가 자동 생성한 도메인 확인:
   ```
   https://your-app-name.up.railway.app
   ```
3. 커스텀 도메인 추가 가능 (선택사항)

## ✅ 배포 확인

### 웹사이트 접속
```
https://your-app-name.up.railway.app
```

### 로그인 페이지 확인
```
https://your-app-name.up.railway.app/login.html
```

### 첫 번째 계정 생성
1. 로그인 페이지에서 "Register" 탭 선택
2. 계정 생성
3. 로그인 후 메인 리더 화면 확인

## 🔧 설정 및 관리

### 로그 확인
Railway 대시보드에서 **"Logs"** 탭 확인:
- 실시간 서버 로그
- 에러 및 디버그 정보
- 데이터베이스 초기화 메시지

### 데이터베이스
- SQLite 파일은 `/app/reader.db`에 저장
- Railway의 영구 볼륨에 자동 저장
- 재배포해도 데이터 유지됨

### 업로드 파일
- 업로드된 PDF/EPUB은 `/app/uploads/`에 저장
- 마찬가지로 영구 저장됨

### 성능 최적화
Railway 무료 티어 제한:
- **512 MB RAM**
- **1 GB Disk**
- **월 $5 크레딧** (약 500시간 실행)

## 🔄 업데이트 배포

### GitHub Push로 자동 배포
```bash
# 코드 수정 후
git add .
git commit -m "Update features"
git push origin claude/pdf-reader-translator-011CUpbHwwWRm27xQSEgmgEh

# Railway가 자동으로 감지하고 재배포
```

### 수동 재배포
1. Railway 대시보드에서 **"Deployments"** 탭
2. **"Deploy"** 버튼 클릭
3. 최신 커밋으로 재배포

## ⚠️ 주의사항

### 1. 데이터베이스 백업
```bash
# Railway CLI 설치
npm i -g @railway/cli

# Railway 로그인
railway login

# 프로젝트 연결
railway link

# 데이터베이스 다운로드
railway run sqlite3 reader.db .dump > backup.sql
```

### 2. 환경 변수 보안
- **SESSION_SECRET**은 절대 공개하지 마세요
- GitHub에 커밋하지 마세요 (.env는 .gitignore에 포함됨)

### 3. 파일 업로드 제한
- Railway 무료 티어: 1GB 디스크
- 대용량 PDF는 제한 고려

## 🐛 문제 해결

### 배포 실패 시
1. **로그 확인**
   - Railway 대시보드 → "Logs" 탭
   - 에러 메시지 확인

2. **빌드 실패**
   ```bash
   # package.json 확인
   # Node 버전 확인 (>=18.x)
   ```

3. **better-sqlite3 설치 실패**
   - Railway는 자동으로 네이티브 모듈 빌드
   - 로그에서 빌드 과정 확인

### 데이터베이스 에러
```bash
# Railway 콘솔에서 확인
railway run ls -la
railway run cat reader.db

# 권한 확인
railway run chmod 666 reader.db
```

### 파일 업로드 실패
```bash
# uploads 폴더 확인
railway run ls -la uploads/
railway run chmod 777 uploads/
```

## 📊 모니터링

### Railway 대시보드
- **Metrics**: CPU, Memory, Network 사용량
- **Logs**: 실시간 서버 로그
- **Deployments**: 배포 히스토리

### 권장 모니터링
```javascript
// server.js에 이미 포함된 로그
console.log('🚀 Server running on http://localhost:${PORT}');
console.log('✅ Database initialized successfully');
```

## 🎉 배포 완료!

배포가 완료되면:

1. ✅ 로그인/회원가입 가능
2. ✅ PDF/EPUB 업로드 및 읽기
3. ✅ 번역 및 문법 설명
4. ✅ Bionic Reading 기능
5. ✅ 단어장 관리
6. ✅ 모든 데이터 영구 저장

## 💡 추가 기능

### 커스텀 도메인 연결
1. Railway 대시보드 → "Settings" → "Domains"
2. "Add Domain" 클릭
3. 본인 도메인 입력 (예: reader.yourdomain.com)
4. DNS 설정에서 CNAME 레코드 추가:
   ```
   CNAME reader your-app-name.up.railway.app
   ```

### PostgreSQL 추가 (선택사항)
SQLite 대신 PostgreSQL 사용 시:
1. Railway에서 "New" → "Database" → "PostgreSQL"
2. 자동으로 `DATABASE_URL` 환경 변수 생성
3. `database.js` 코드 수정 필요

## 📞 지원

문제가 발생하면:
- Railway 커뮤니티: https://discord.gg/railway
- Railway 문서: https://docs.railway.app
- 프로젝트 이슈: GitHub Issues

---

**Happy Deploying! 🚀**
