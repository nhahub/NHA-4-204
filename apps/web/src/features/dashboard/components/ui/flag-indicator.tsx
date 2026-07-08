import { CheckCircleIcon, XCircleIcon } from "lucide-react";

interface FlagIndicatorProps {
	label: string;
	value: boolean;
	warn?: boolean;
}

export function FlagIndicator({ label, value, warn }: FlagIndicatorProps) {
	if (value && warn) {
		return (
			<div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
				<XCircleIcon className="size-4 text-destructive shrink-0" />
				<span className="text-sm font-medium">{label}</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2.5 rounded-lg bg-surface-secondary px-3 py-2.5">
			<CheckCircleIcon className="size-4 text-success shrink-0" />
			<span className="text-sm text-muted-foreground">{label}</span>
		</div>
	);
}
