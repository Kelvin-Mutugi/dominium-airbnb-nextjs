interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onLoadMore?: () => void;
	hasMore?: boolean;
	isLoadingMore?: boolean;
}

export default function Pagination({
	currentPage,
	totalPages,
	onPageChange,
	onLoadMore,
	hasMore = false,
	isLoadingMore = false,
}: PaginationProps) {
	if (totalPages <= 1 && !hasMore) return null;

	return (
		<nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
			<button
				type="button"
				disabled={currentPage === 1}
				onClick={() => onPageChange(currentPage - 1)}
				className="border border-[#E9E6DD] px-3 py-2 text-sm text-[#36454F] disabled:cursor-not-allowed disabled:opacity-40"
			>
				Previous
			</button>

			{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
				<button
					key={page}
					type="button"
					aria-current={page === currentPage ? "page" : undefined}
					onClick={() => onPageChange(page)}
					className={`h-9 min-w-9 border px-2 text-sm ${
						page === currentPage
							? "border-[#1B1A2E] bg-[#1B1A2E] text-white"
							: "border-[#E9E6DD] text-[#36454F]"
					}`}
				>
					{page}
				</button>
			))}

			<button
				type="button"
				disabled={(currentPage === totalPages && !hasMore) || isLoadingMore}
				onClick={() => {
					if (currentPage === totalPages && hasMore) {
						onLoadMore?.();
						return;
					}
					onPageChange(currentPage + 1);
				}}
				className="border border-[#E9E6DD] px-3 py-2 text-sm text-[#36454F] disabled:cursor-not-allowed disabled:opacity-40"
			>
				{isLoadingMore ? "Loading..." : "Next"}
			</button>
		</nav>
	);
}
