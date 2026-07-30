import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Card, PrimaryButton } from "./MiniShell";

export function LoginDialog({
  reason,
  onCancel,
  onConfirm,
}: {
  reason: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-foreground/40 p-4">
      <Card className="w-full">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-brand-soft">
            <LockKeyhole className="size-5 text-foreground/75" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-foreground">需要微信快捷登录</h2>
            <p className="text-[11px] text-muted-foreground">登录前先说明用途</p>
          </div>
        </div>
        <div className="mt-4 rounded-[14px] bg-surface-sunk p-3">
          <p className="text-[12px] font-medium text-foreground">本次登录用于：</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{reason}</p>
        </div>
        <div className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <p>
            仅关联 travelmate 账号状态与用户主动保存的数据；不会自动读取微信聊天、相册或通讯录。
          </p>
        </div>
        <div className="mt-4 space-y-2">
          <PrimaryButton onClick={onConfirm}>微信快捷登录</PrimaryButton>
          <button
            onClick={onCancel}
            className="w-full py-2 text-[12px] font-medium text-muted-foreground"
          >
            暂不登录
          </button>
        </div>
      </Card>
    </div>
  );
}
