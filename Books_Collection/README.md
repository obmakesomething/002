# 📚 Books Collection

이 폴더에 PDF나 EPUB 파일을 넣으면 서버 시작 시 자동으로 라이브러리에 추가됩니다.

## 📖 지원 형식
- PDF (`.pdf`)
- EPUB (`.epub`)

## 🚀 빠른 시작

### 방법 1: 로컬에서 파일 추가 후 푸시
```bash
# 1. 이 폴더에 책 파일 복사
cp /path/to/your/book.pdf Books_Collection/

# 2. Git에 추가 및 커밋
git add Books_Collection/
git commit -m "Add books"
git push

# 3. Railway가 자동 배포 (1-2분)
# 4. 📚 Books 탭에서 확인!
```

### 방법 2: Git LFS로 대용량 파일 관리 (>50MB)
```bash
# 한 번만 설정
git lfs install
git lfs track "*.pdf"
git lfs track "*.epub"

# 파일 추가
cp your-large-book.pdf Books_Collection/
git add .gitattributes Books_Collection/
git commit -m "Add books via Git LFS"
git push
```

## 📂 현재 상태
- 파일 개수: **0개**
- 폴더가 비어있습니다. 책을 추가해주세요!

## ✅ 자동 임포트 확인
서버 시작 시 로그에서 확인:
```
📚 Found N book(s) in Books_Collection
  ✅ Imported: book.pdf (ID: 1)
```

## 💡 팁
- 책 제목은 파일명에서 자동 추출됩니다
- 중복된 책은 자동으로 건너뜁니다
- Railway는 재시작해도 이 폴더의 파일은 유지됩니다 (Git에 있으므로)
