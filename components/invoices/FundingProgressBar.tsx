"use client";

import { useEffect, useState } from "react";

interface FundingProgressBarProps {
    raised: number;
    target: number;
}

export function FundingProgressBar({ raised, target }: FundingProgressBarProps) {
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
            <p className="text-sm text-muted-foreground">
                {raised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM raised of{" "}
                {target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
            </p>
        </div>
    );
}