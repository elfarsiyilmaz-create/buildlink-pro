import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

type WeekPoint = {
  day: string;
  punten: number;
};

type PersonalDashboardChartProps = {
  data: WeekPoint[];
};

const PersonalDashboardChart = ({ data }: PersonalDashboardChartProps) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
      <YAxis hide />
      <Tooltip
        contentStyle={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          fontSize: '12px',
        }}
      />
      <Bar dataKey="punten" fill="hsl(0, 100%, 50%)" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export default PersonalDashboardChart;
