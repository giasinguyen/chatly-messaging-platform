import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ForgotPasswordDialogProps {
    email: string;
}

export function ForgotPasswordDialog({ email }: ForgotPasswordDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="mt-0.5 w-fit cursor-pointer border-none bg-transparent p-0 text-left text-[13px] text-brand no-underline transition-colors duration-200 hover:text-brand-light hover:underline dark:text-brand-light dark:hover:text-brand-light"
                >
                    Forgot your password?
                </button>
            </DialogTrigger>
            <DialogContent className="w-[90%] max-w-[420px] rounded-[24px] border-none bg-white p-6 shadow-2xl dark:bg-[rgba(30,33,40,0.98)] dark:text-white sm:rounded-[24px]">
                <DialogHeader className="space-y-3 text-center sm:text-left">
                    <DialogTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Instructions Sent
                    </DialogTitle>
                    <DialogDescription className="text-[15px] leading-relaxed text-gray-600 dark:text-[#a0a3ab]">
                        We sent instructions to change your password to{" "}
                        <strong className="font-semibold text-gray-900 dark:text-white">
                            {email || "your email address"}
                        </strong>
                        , please check both your inbox and spam folder.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex w-full">
                    <DialogClose asChild>
                        <button
                            onClick={() =>
                                toast(
                                    "Xin lỗi, tính năng đang trong giai đoạn thử nghiệm và phát triển",
                                )
                            }
                            type="button"
                            className="w-full cursor-pointer rounded-full border-none bg-brand py-2.5 text-[15px] font-semibold text-white transition-all duration-300 hover:bg-brand-hover"
                        >
                            Okay
                        </button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
