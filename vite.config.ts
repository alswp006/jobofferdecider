import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  // 빌드는 항상 프로덕션으로 고정한다.
  // Vite는 isProduction을 process.env.NODE_ENV로 판정하므로, 러너가 NODE_ENV=test인 채
  // build를 호출하면(vitest execSync 등) 개발용 react-dom이 번들된다. 그러면 disableLogs가
  // console.error/log/group을 "호출"이 아닌 "속성 참조"로 들고 있어 esbuild drop이 못 지우고,
  // 검수 기준인 번들 내 console.error 0건이 깨진다. config에서 NODE_ENV를 세팅하는 건
  // Vite가 공식 안내하는 방법이며, 이 함수는 isProduction 계산 전에 실행된다.
  if (isBuild) {
    process.env.NODE_ENV = 'production';
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // 프로덕션 빌드에서만 console/debugger 제거 — 검수는 console.error 0건을 요구한다.
    // dev 서버에는 적용하지 않는다(디버깅 로그가 사라지면 개발이 불가능).
    esbuild: isBuild ? { drop: ['console', 'debugger'] } : {},
    build: {
      outDir: 'dist',
      // Android 7 / iOS 16 WebView 하한선. 최신 문법을 여기까지 다운레벨한다.
      target: 'es2018',
      sourcemap: false,
      // @apps-in-toss/web-framework는 절대 external 금지.
      // SDK는 importmap이 아닌 window.ReactNativeWebView 글로벌로 통신하므로
      // 번들에 포함해야 정상 동작. external 설정 시 bare specifier가 번들 첫 줄에
      // 남아 브라우저가 해석 불가 → JS 한 줄도 실행 안 됨 → 흰 화면.
      rollupOptions: {},
    },
  };
});
