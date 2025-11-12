# Railway Git LFS 설정 가이드

## 문제
EPUB 파일이 Git LFS 포인터 파일(132바이트)만 있어서 로드되지 않습니다.

## 해결 방법

### 옵션 1: Railway에서 Git LFS 활성화 (권장)

1. Railway 대시보드 접속
2. 프로젝트 선택
3. **Settings** → **Environment Variables**
4. 새 변수 추가:
   - **Key**: `RAILWAY_GIT_LFS` 
   - **Value**: `true`
5. Redeploy

### 옵션 2: 샘플 EPUB 파일로 테스트

Books_Collection에서 Git LFS를 제거하고 작은 샘플 파일 몇 개만 추가:

```bash
# LFS 제거
git lfs untrack "*.epub"
git lfs untrack "*.pdf"

# .gitattributes 수정
rm .gitattributes

# 작은 샘플 파일만 추가 (< 10MB)
git add Books_Collection/EPUB/Sample/*.epub
git commit -m "Add sample EPUB files without LFS"
git push
```

### 옵션 3: Railway Volume 사용

Railway Volume을 생성하고 파일을 직접 업로드:

1. Railway Dashboard → Project → Add Volume
2. Mount path: `/app/Books_Collection`
3. Volume에 EPUB 파일 업로드

### 옵션 4: 외부 스토리지 사용

Cloudflare R2, AWS S3 등에 파일을 업로드하고 서버에서 프록시

## 확인 방법

Railway 로그에서 다음 메시지 확인:
```
Downloading Git LFS files...
✓ Downloaded 72 files
```
