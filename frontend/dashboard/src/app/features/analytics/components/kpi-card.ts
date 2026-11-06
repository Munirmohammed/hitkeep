import { ChangeDetectionStrategy, Component, computed, input, OnChanges, OnDestroy, signal, SimpleChanges } from '@angular/core';
import { AnimatedDuration } from '@components/animated-duration/animated-duration';
import { AnimatedNumber } from '@components/animated-number/animated-number';
import { CardModule } from '@openng/optimus-ui/card';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { injectSkeletonGate } from '@services/report-subject.service';

export const KPI_PERCENT_FORMAT: Intl.NumberFormatOptions = Object.freeze({
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
});

export const KPI_ONE_DECIMAL_FORMAT: Intl.NumberFormatOptions = Object.freeze({
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
});

export const KPI_SHORT_DECIMAL_FORMAT: Intl.NumberFormatOptions = Object.freeze({
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
});

export const KPI_MONEY_FALLBACK_FORMAT: Intl.NumberFormatOptions = Object.freeze({
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const KPI_DELTA_FORMAT: Intl.NumberFormatOptions = Object.freeze({
    style: 'percent',
    signDisplay: 'always',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
});

export interface KpiCardModel {
    label: string;
    value: string | number;
    loading: boolean;
    valueClass?: string;
    format?: Intl.NumberFormatOptions;
    prefix?: string;
    suffix?: string;
    duration?: boolean;
    delta?: number | null;
    invertDelta?: boolean;
    updateKey?: number;
}

@Component({
    selector: 'app-kpi-card',
    standalone: true,
    imports: [CardModule, SkeletonModule, AnimatedDuration, AnimatedNumber],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-card class="shadow-sm h-full border border-surface-200 dark:border-surface-700 surface-card">
            <div class="hk-kpi-card__body flex flex-col gap-2">
                @for (cue of updateCues(); track cue) {
                    <span class="hk-kpi-card__update-cue" [attr.data-update-cue]="cue" aria-hidden="true"></span>
                }
                <span class="hk-kpi-card__content text-xs font-semibold uppercase tracking-wider text-muted-color">{{ label() }}</span>
                <div [class]="displayClass()">
                    @if (showSkeleton()) {
                        <p-skeleton width="60%" height="2rem" />
                    } @else {
                        @let numeric = numericValue();
                        @if (numeric !== null) {
                            @if (duration()) {
                                <app-animated-duration [value]="numeric" />
                            } @else {
                                <app-animated-number [value]="numeric" [format]="format()" [prefix]="prefix()" [suffix]="suffix()" />
                            }
                        } @else {
                            {{ value() }}
                        }
                    }
                </div>
                @let deltaValue = normalizedDelta();
                @if (!showSkeleton() && deltaValue !== null) {
                    <div class="hk-kpi-card__content flex items-center gap-1 mt-0.5">
                        <span [class]="deltaClass()"><app-animated-number [value]="deltaValue" [format]="deltaFormat" /></span>
                    </div>
                }
            </div>
        </p-card>
    `,
    styles: [
        `
            :host {
                display: block;
                height: 100%;
            }

            :host ::ng-deep .p-card {
                border-radius: 0.75rem;
                transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
            }

            :host ::ng-deep .p-card:hover {
                transform: translateY(-2px);
                border-color: color-mix(in srgb, var(--p-primary-color) 30%, var(--p-content-border-color));
                box-shadow: 0 10px 24px -6px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04);
            }

            .hk-kpi-card__body {
                border-radius: 0.5rem;
                isolation: isolate;
                margin: -0.25rem;
                overflow: hidden;
                padding: 0.25rem;
                position: relative;
            }

            .hk-kpi-card__content {
                position: relative;
                z-index: 1;
            }

            .hk-kpi-card__update-cue {
                background: color-mix(in srgb, var(--p-text-color) 5%, transparent);
                border-radius: inherit;
                display: none;
                inset: 0;
                pointer-events: none;
                position: absolute;
                z-index: 0;
            }

            @media (prefers-reduced-motion: reduce) {
                .hk-kpi-card__update-cue {
                    display: block;
                }
            }
        `
    ]
})
export class KpiCard implements OnChanges, OnDestroy {
    label = input.required<string>();
    value = input.required<string | number>();
    loading = input<boolean>(false);
    updateKey = input<number>(0);
    valueClass = input<string>('');
    format = input<Intl.NumberFormatOptions>();
    prefix = input<string>();
    suffix = input<string>();
    duration = input<boolean>(false);
    delta = input<number | null>(null);
    invertDelta = input<boolean>(false);

    private cueSequence = 0;
    private cueTimer: ReturnType<typeof setTimeout> | null = null;
    /** Whether a value was on screen before the change currently being handled. */
    private hasPaintedValue = false;

    protected readonly showSkeleton = injectSkeletonGate(this.loading);
    protected readonly updateCues = signal<readonly number[]>([]);
    protected readonly deltaFormat = KPI_DELTA_FORMAT;
    protected displayClass = computed(() => `hk-kpi-card__content ${this.valueClass() || 'text-2xl xl:text-3xl font-bold'}`);
    protected numericValue = computed(() => {
        const value = this.value();
        return typeof value === 'number' && Number.isFinite(value) ? value : null;
    });
    protected normalizedDelta = computed(() => {
        const delta = this.delta();
        if (delta === null || !Number.isFinite(delta)) return null;
        return (this.invertDelta() ? -delta : delta) / 100;
    });

    protected deltaClass = computed(() => {
        const normalized = this.normalizedDelta();
        if (normalized === null) return '';
        const positive = normalized >= 0;
        return positive
            ? 'text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shadow-2xs'
            : 'text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/12 text-rose-700 dark:text-rose-400 border border-rose-500/25 shadow-2xs';
    });

    ngOnChanges(changes: SimpleChanges): void {
        const skeleton = this.showSkeleton();
        const wasPainted = this.hasPaintedValue;
        this.hasPaintedValue = !skeleton;
        if (skeleton || !wasPainted) {
            // Nothing was on screen to change: the first value after a skeleton
            // is an arrival, not an update.
            return;
        }

        const value = changes['value'];
        const valueChanged = !!value && !value.firstChange && !Object.is(value.previousValue, value.currentValue);
        // An advancing key cues a refresh that happened to land on the same
        // number, which a value comparison alone cannot see.
        const updateKey = changes['updateKey'];
        const keyAdvanced = !!updateKey && !updateKey.firstChange && Number(updateKey.currentValue) > Number(updateKey.previousValue);
        if (!valueChanged && !keyAdvanced) {
            return;
        }

        this.showUpdateCue();
    }

    ngOnDestroy(): void {
        if (this.cueTimer) {
            clearTimeout(this.cueTimer);
        }
    }

    private showUpdateCue(): void {
        if (this.cueTimer) {
            clearTimeout(this.cueTimer);
        }

        this.updateCues.set([++this.cueSequence]);
        this.cueTimer = setTimeout(() => {
            this.updateCues.set([]);
            this.cueTimer = null;
        }, 600);
    }
}
