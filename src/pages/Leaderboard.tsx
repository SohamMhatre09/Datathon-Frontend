import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { Award, RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LeaderboardEntry {
  user_id: string;
  item_accuracy: number;
  l0_accuracy?: number;
  l1_accuracy?: number;
  l2_accuracy?: number;
  l3_accuracy?: number;
  l4_accuracy?: number;
  brand_accuracy?: number;
  timestamp: string;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsRefreshing(true);
      console.log('Fetching leaderboard data from:', `${API_URL}/leaderboard?limit=20`);
      
      const response = await axios.get<LeaderboardResponse>(`${API_URL}/leaderboard?limit=20`);
      console.log('API response received:', response.data);
      
      if (response.data && response.data.leaderboard && Array.isArray(response.data.leaderboard)) {
        console.log('Setting leaderboard with data:', response.data.leaderboard);
        setLeaderboard(response.data.leaderboard);
      } else {
        console.error('Unexpected API response format:', response.data);
        toast.error('Received unexpected data format from server');
        // Ensure leaderboard is always an array
        setLeaderboard([]);
      }
      
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      toast.error(error.response?.data?.error || 'Failed to load leaderboard');
      // Ensure leaderboard is always an array
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    console.log('Leaderboard component mounted, fetching data...');
    fetchLeaderboard();
    
    // Auto-refresh every 2 minutes
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing leaderboard...');
      fetchLeaderboard();
    }, 2 * 60 * 1000);
    
    return () => {
      console.log('Leaderboard component unmounting, clearing interval');
      clearInterval(intervalId);
    };
  }, [fetchLeaderboard]);

  // Log when leaderboard state changes
  useEffect(() => {
    console.log('Leaderboard state updated:', leaderboard);
  }, [leaderboard]);

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    fetchLeaderboard();
  };

  const isCurrentUser = (userId: string) => {
    return user && user.username === userId;
  };

  const formatAccuracy = (value?: number) => {
    if (value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  console.log('Rendering leaderboard component with data:', leaderboard);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competition Leaderboard</h1>
          <p className="text-gray-600">Top performers ranked by Item Accuracy</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
          </div>
          <div>Auto-refreshes every 2 minutes</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Accuracy
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  L0
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  L1
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  L2
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  L3
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  L4
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submission Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                  <tr 
                    key={`${entry.user_id}-${index}`}
                    className={isCurrentUser(entry.user_id) ? 'bg-indigo-50' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 ? (
                          <Award className={`h-5 w-5 mr-1 ${
                            index === 0 ? 'text-yellow-500' : 
                            index === 1 ? 'text-gray-400' : 
                            'text-amber-700'
                          }`} />
                        ) : null}
                        <span className={`text-sm font-medium ${
                          index < 3 ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.user_id}
                          {isCurrentUser(entry.user_id) && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-semibold">{formatAccuracy(entry.item_accuracy)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatAccuracy(entry.l0_accuracy)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatAccuracy(entry.l1_accuracy)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatAccuracy(entry.l2_accuracy)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatAccuracy(entry.l3_accuracy)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatAccuracy(entry.l4_accuracy)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatAccuracy(entry.brand_accuracy)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-500">
                    No entries yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Leaderboard;