import { ROUTES } from "./homeData";

export default function QuickRoutes() {
  return (
    <section className="px-[6%] pb-[20px] pt-[50px]">
      <h3 className="mb-[16px] font-mono text-[12px] uppercase tracking-[2px] text-[#3A3856]/60">
        Quick routes
      </h3>

      <div className="flex gap-[10px] overflow-x-auto pb-2">
        {ROUTES.map((route, index) => (
          <div
            key={route}
            className={`flex-none whitespace-nowrap rounded-full border-[1.5px] px-[18px] py-[10px] font-mono text-[13px] tracking-[1px] ${
              index === 0
                ? "border-[#E89A1C] bg-[#E89A1C] text-[#1B1A2E]"
                : "border-[#E9E6DD] bg-white text-[#1B1A2E]"
            }`}
          >
            {route}
          </div>
        ))}
      </div>
    </section>
  );
}
