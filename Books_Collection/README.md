# 📚 Books Collection

이 폴더에 PDF나 EPUB 파일을 넣으면 서버 시작 시 자동으로 라이브러리에 추가됩니다.

## 📖 지원 형식
- PDF (`.pdf`)
- EPUB (`.epub`)

## 🚀 사용법

### 1. 책 파일 추가
이 폴더에 PDF나 EPUB 파일을 직접 복사하세요:
```bash
# 예시
cp /path/to/your/book.pdf Books_Collection/
```

### 2. Git에 커밋
```bash
git add Books_Collection/
git commit -m "Add books"
git push
```

### 3. Railway 자동 배포
- Railway가 자동으로 재배포됩니다 (약 1-2분)
- 서버가 시작되면 이 폴더를 스캔합니다
- 새로운 책들이 자동으로 데이터베이스에 등록됩니다
- **📚 Books** 탭에서 바로 읽을 수 있습니다!

## ⚠️ Git LFS 사용 (대용량 파일)
```bash
git lfs install
git lfs track "*.pdf"
git lfs track "*.epub"
git add .gitattributes
git add Books_Collection/
git commit -m "Add books via Git LFS"
git push
```
