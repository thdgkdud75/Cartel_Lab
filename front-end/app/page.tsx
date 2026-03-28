export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">
          Cartel Lab
        </span>
        <h1 className="text-5xl font-bold tracking-tight">
          Welcome Back
        </h1>
        <p className="text-gray-400 text-lg">
          팀원들과 함께하는 공간
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <div className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-2 hover:bg-gray-700 transition-colors cursor-pointer">
          <span className="text-2xl">📅</span>
          <span className="font-semibold">플래너</span>
          <span className="text-sm text-gray-400">일정 관리</span>
        </div>
        <div className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-2 hover:bg-gray-700 transition-colors cursor-pointer">
          <span className="text-2xl">💼</span>
          <span className="font-semibold">공고</span>
          <span className="text-sm text-gray-400">채용 정보</span>
        </div>
        <div className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-2 hover:bg-gray-700 transition-colors cursor-pointer">
          <span className="text-2xl">🪑</span>
          <span className="font-semibold">좌석</span>
          <span className="text-sm text-gray-400">자리 현황</span>
        </div>
        <div className="bg-indigo-600 rounded-2xl p-5 flex flex-col gap-2 hover:bg-indigo-500 transition-colors cursor-pointer">
          <span className="text-2xl">📊</span>
          <span className="font-semibold">대시보드</span>
          <span className="text-sm text-indigo-200">통계 보기</span>
        </div>
      </div>

      <button className="mt-4 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-semibold transition-colors">
        시작하기
      </button>
    </main>
  );
}
