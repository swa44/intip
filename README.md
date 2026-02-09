# 인테리어꿀팁 블로그

실전 인테리어 노하우를 공유하는 블로그입니다.

## 🚀 배포 방법

### Vercel로 배포하기

1. **GitHub 저장소 생성**

```bash
cd /Users/scrowna/Desktop/web/intip/root
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Vercel 배포**

- [Vercel](https://vercel.com)에 로그인
- "New Project" 클릭
- GitHub 저장소 연결
- 자동으로 배포됩니다!

### Cloudflare Pages로 배포하기 (대안)

1. **GitHub 저장소 연결**

- [Cloudflare Pages](https://pages.cloudflare.com)에 로그인
- "Create a project" 클릭
- GitHub 저장소 선택

2. **빌드 설정**

- Framework preset: None
- Build command: (비워두기)
- Build output directory: `/`

## 📝 블로그 관리

### 관리자 페이지

`/admin.html`에 접속하여 새 게시물을 작성할 수 있습니다.

**기능:**

- ✍️ 리치 텍스트 에디터 (제목, 굵게, 기울임, 정렬 등)
- 📷 이미지 업로드 및 드래그 앤 드롭
- 💾 로컬 저장 (LocalStorage)
- ⬇️ HTML 파일 다운로드
- 👁️ 실시간 미리보기

### 새 게시물 추가 방법

1. `http://localhost:3000/admin.html` 접속
2. 제목, 카테고리, 본문 작성
3. 이미지 업로드 (선택사항)
4. "저장하기" 버튼 클릭
5. "HTML 다운로드" 버튼으로 파일 다운로드
6. 다운로드한 파일을 `/posts/` 폴더에 저장
7. `index.html`에 새 게시물 카드 추가

## 📁 프로젝트 구조

```
root/
├── index.html          # 메인 페이지
├── admin.html          # 관리자 페이지 (새로 추가!)
├── about.html          # 소개 페이지
├── privacy.html        # 개인정보처리방침
├── terms.html          # 이용약관
├── create-post.html    # 구버전 게시물 작성 페이지
├── vercel.json         # Vercel 배포 설정
└── posts/              # 블로그 게시물
    ├── small-space-tips.html
    ├── lighting-guide.html
    ├── color-psychology.html
    ├── furniture-layout.html
    ├── diy-wallpaper.html
    ├── storage-solutions.html
    ├── kitchen-remodeling.html
    ├── bathroom-upgrade.html
    ├── plant-interior.html
    └── budget-interior.html
```

## 🎨 기능

### 사용자 기능

- 📱 반응형 디자인
- 🔍 SEO 최적화
- 📝 10개의 고품질 게시물 (각 2,000자 이상)
- 🏷️ 카테고리별 분류

### 관리자 기능 (admin.html)

- ✨ Quill 리치 텍스트 에디터
- 🖼️ 이미지 업로드 및 관리
- 💾 자동 저장 (LocalStorage)
- 📥 HTML 파일 다운로드
- 👁️ 실시간 미리보기
- 📋 저장된 게시물 목록

## 🌐 도메인 연결

### Cloudflare 도메인 연결

1. **Cloudflare DNS 설정**

- Cloudflare 대시보드 → DNS
- CNAME 레코드 추가:
  - Name: `@` (또는 `www`)
  - Target: `<your-vercel-url>.vercel.app`
  - Proxy status: Proxied (주황색 구름)

2. **Vercel 도메인 설정**

- Vercel 프로젝트 → Settings → Domains
- 도메인 추가
- Cloudflare에서 제공한 DNS 레코드 확인

## 📊 Google AdSense 준비

### 체크리스트

- [x] 독창적인 콘텐츠 (10개 게시물)
- [x] 필수 정책 페이지 (Privacy, Terms, About)
- [x] 반응형 디자인
- [x] SEO 최적화
- [ ] 20-30개 게시물 (권장)
- [ ] 3개월 이상 운영
- [ ] 일일 방문자 100명 이상

## 🛠️ 로컬 개발

```bash
# 서버 실행
npx serve

# 브라우저에서 접속
http://localhost:3000

# 관리자 페이지
http://localhost:3000/admin.html
```

## 📞 지원

문제가 발생하면 이슈를 등록해주세요.

---

**Made with ❤️ for Interior Design Enthusiasts**
