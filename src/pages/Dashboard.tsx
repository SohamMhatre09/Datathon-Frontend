import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { BarChart2, Upload, Award, TrendingUp } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Score {
  item_accuracy?: number;
  accuracy?: number;
  f1?: number;
  timestamp: string;
}

interface UserStats {
  total_submissions: number;
  best_f1?: number | null;
  uploads_today: number;
  submissions_remaining: number;
  max_daily_submissions?: number;
  next_reset?: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [scores, setScores] = useState<Score[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [scoresResponse, remainingResponse] = await Promise.all([
          axios.get(`${API_URL}/scores`),
          axios.get(`${API_URL}/remaining-submissions`)
        ]);
        
        setScores(scoresResponse.data.scores);
        setStats({
          ...scoresResponse.data.stats,
          submissions_remaining: remainingResponse.data.submissions_remaining,
          max_daily_submissions: remainingResponse.data.max_daily_submissions,
          next_reset: remainingResponse.data.next_reset
        });
      } catch (error: any) {
        console.error('Error fetching user data:', error);
        toast.error(error.response?.data?.error || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Prepare chart data - safely handling undefined values
  const chartData = {
    labels: scores.map(score => new Date(score.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'F1 Score',
        data: scores.map(score => score.f1 || 0),
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Item Accuracy',
        data: scores.map(score => score.accuracy || score.item_accuracy || 0),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Performance Metrics Over Time',
      },
    },
    scales: {
      y: {
        min: 0,
        max: 1,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Function to safely format numbers with a default value
  const formatNumber = (value: number | null | undefined, decimals = 4) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(decimals) : 'N/A';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600">Welcome back, {user?.username}!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <div className="flex items-center">
            <Award className="h-10 w-10 mr-3" />
            <div>
              <p className="text-indigo-100 text-sm">Best Score</p>
              <p className="text-2xl font-bold">{formatNumber(stats?.best_f1)}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center">
            <BarChart2 className="h-10 w-10 mr-3" />
            <div>
              <p className="text-green-100 text-sm">Total Submissions</p>
              <p className="text-2xl font-bold">{stats?.total_submissions || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center">
            <Upload className="h-10 w-10 mr-3" />
            <div>
              <p className="text-blue-100 text-sm">Uploads Today</p>
              <p className="text-2xl font-bold">{stats?.uploads_today || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center">
            <TrendingUp className="h-10 w-10 mr-3" />
            <div>
              <p className="text-purple-100 text-sm">Submissions Remaining</p>
              <p className="text-2xl font-bold">{stats?.submissions_remaining ?? 0}</p>
              {stats?.max_daily_submissions && stats?.next_reset && (
                <p className="text-xs mt-1 opacity-75">
                  {stats.max_daily_submissions} daily limit • Resets {new Date(stats.next_reset).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Performance Trend">
          {scores.length > 0 ? (
            <div className="h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
              <BarChart2 className="h-12 w-12 mb-2" />
              <p>No submission data available yet</p>
            </div>
          )}
        </Card>

        <Card title="Recent Submissions">
          {scores.length > 0 ? (
            <div className="overflow-y-auto max-h-80">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Accuracy</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scores.slice(0, 10).map((score: Score, index: number) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {new Date(score.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(score.accuracy || score.item_accuracy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <p>No submissions yet</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;