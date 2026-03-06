import { Button } from "@/components/ui/button";
import { useBear } from "@/store/store";

function App() {
    // Lấy state và actions từ store
    const bears = useBear((state: any) => state.bears);
    const increasePopulation = useBear(
        (state: any) => state.increasePopulation,
    );
    const removeAllBears = useBear((state: any) => state.removeAllBears);

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4">
            <p>
                🐻 Số gấu: <strong>{bears}</strong>
            </p>
            <Button onClick={increasePopulation}>Thêm gấu</Button>
            <Button onClick={removeAllBears} variant="destructive">
                Xóa tất cả
            </Button>
        </div>
    );
}

export default App;

