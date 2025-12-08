'use client';

interface SettingsItemProps {
  label: string;
  description?: string;
  control?: React.ReactNode; // 토글, 셀렉트, 버튼 등
  onClick?: () => void;      // 전체 행 클릭 시
  disabled?: boolean;
}

export default function SettingsItem({ 
  label, 
  description, 
  control, 
  onClick, 
  disabled 
}: SettingsItemProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={disabled ? undefined : onClick}
      className={`
        w-full flex items-center justify-between gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0
        min-h-[56px]
        ${onClick ? 'text-left hover:bg-white/5 transition-colors' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer' : ''}
      `}
    >
      <div className="flex flex-col flex-1">
        <span className="text-sm font-medium text-white">{label}</span>
        {description && (
          <span className="mt-0.5 text-xs text-white/60">{description}</span>
        )}
      </div>
      {control && (
        <div className="flex-shrink-0">
          {control}
        </div>
      )}
    </Wrapper>
  );
}

