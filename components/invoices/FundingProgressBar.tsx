"use client";

import { useEffect, useState } from "react";

interface FundingProgressBarProps {
    raised: number;
    target: number;
    investorCount: number;
}

export function FundingProgressBar({ raised, target, investorCount }: FundingProgressBarProps) {
    const [animatedWidth, setAnimatedWidth] = useState(0);

    const percentage = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
    const isFullyFunded = percentage >= 100;

    useEffect(() => {
        // Animate from 0 to the current percentage on mount
        const timer = setTimeout(() => {
            setAnimatedWidth(percentage);
        }, 100);
        return () => clearTimeout(timer);
    }, [percentage]);

    return (
        <div className="space-y-4">
            <div>
                <div className="flex justify-between text-sm mb-2">
                    <span>Raised</span>
                    <span>{percentage.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-out ${isFullyFunded ? "bg-green-500" : "bg-primary"
                            }`}
                        style={{ width: `${animatedWidth}%` }}
                    />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {raised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM raised of{" "}
                    {target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
                </p>
                <div className="flex items-center gap-2">
                    {isFullyFunded && (
                        <span className="inline-flex items-center rounded-full border border-transparent bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                            Fully Funded
                        </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                        {investorCount} {investorCount === 1 ? "investor" : "investors"}
                    </span>
                </div>
            </div>
        </div>
    );
}