# Figure Curator

한국 피규어 쇼핑몰 22개의 통합 검색 데스크탑 앱 (Windows / macOS / Linux)

**Tech Stack:** Tauri v2 · Rust · React · TypeScript

---

## 개발환경 세팅

### 공통 사전 설치

- [Node.js](https://nodejs.org/) 20 이상
- [Rust](https://rustup.rs/) (rustup으로 설치)

---

### Windows

**1. Rust 설치**

rustup.rs에서 설치 — toolchain은 `x86_64-pc-windows-msvc` 선택.

**2. Visual Studio Build Tools 2022 이상 설치**

[Build Tools 다운로드](https://visualstudio.microsoft.com/visual-cpp-build-tools/) 후 **"C++를 사용한 데스크톱 개발"** 워크로드 체크. 구성 요소:
- MSVC 빌드 도구 (최신 버전)
- Windows 11 SDK
- C++ Clang 도구 (LLVM)

**3. 추가 도구 설치**

```powershell
winget install Kitware.CMake
winget install NASM.NASM
```

**4. 환경 변수 설정**

시스템 환경 변수에 추가 (경로는 실제 설치된 버전에 맞게 조정):

```
LIBCLANG_PATH=C:\Program Files (x86)\Microsoft Visual Studio\<버전>\BuildTools\VC\Tools\Llvm\x64\bin
```

**5. Microsoft Defender 제외 경로 추가**

빌드 중 생성되는 실행 파일이 차단될 수 있음. Windows 보안 → 바이러스 및 위협 방지 → 제외 추가:

- `C:\Users\<사용자>\.cargo`
- `C:\Users\<사용자>\.rustup`
- `C:\Users\<사용자>\AppData\Local\Temp`
- 프로젝트 폴더 전체

**6. PATH 주의사항**

Git for Windows의 `link.exe`가 MSVC `link.exe`보다 PATH 앞에 있으면 링크 오류 발생. 빌드 전 MSVC bin 경로가 앞에 오도록 확인.

---

### macOS (Apple Silicon M시리즈)

**1. Xcode Command Line Tools 설치**

```bash
xcode-select --install
```

**2. Homebrew로 의존성 설치**

```bash
brew install cmake nasm llvm
```

**3. Rust 설치**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

toolchain은 기본값(`aarch64-apple-darwin`) 사용.

**4. 환경 변수 설정**

`~/.zshrc` 또는 `~/.bash_profile`에 추가:

```bash
export LIBCLANG_PATH="$(brew --prefix llvm)/lib"
export PATH="$(brew --prefix llvm)/bin:$PATH"
```

적용:

```bash
source ~/.zshrc
```

---

## 프로젝트 시작

```bash
npm install
npm run tauri dev
```

## 빌드

```bash
npm run tauri build
```

---

## IDE 설정

- [VS Code](https://code.visualstudio.com/) + [Tauri 확장](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [RustRover](https://www.jetbrains.com/rust/) (JetBrains)
