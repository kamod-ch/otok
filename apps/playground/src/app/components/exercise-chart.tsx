import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kamod-ui/core";
import type { ExerciseDay } from "../data/dashboard";

type ExerciseChartProps = {
  data: ExerciseDay[];
};

export function ExerciseChart({ data }: ExerciseChartProps) {
  const max = Math.max(...data.map((d) => d.minutes), 1);
  const width = 480;
  const height = 200;
  const padding = { top: 12, right: 12, bottom: 28, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / data.length - 8;

  return (
    <Card class="col-span-4">
      <CardHeader>
        <CardTitle>Exercise Minutes</CardTitle>
        <CardDescription>
          Your exercise minutes are ahead of where you normally are.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          class="h-[200px] w-full text-primary"
          role="img"
          aria-label="Exercise minutes bar chart"
        >
          {data.map((point, index) => {
            const barHeight = (point.minutes / max) * chartHeight;
            const x = padding.left + index * (chartWidth / data.length) + 4;
            const y = padding.top + chartHeight - barHeight;
            return (
              <g key={point.day}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  class="fill-primary/80"
                />
                <text
                  x={x + barWidth / 2}
                  y={height - 8}
                  text-anchor="middle"
                  class="fill-muted-foreground text-[10px]"
                >
                  {point.day}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
