'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressReport {
  learnerId: string;
  learnerName: string;
  moduleType: string;
  totalSessions: number;
  totalTimeSpentMs: number;
  itemsProgress: ItemProgress[];
  overallMastery: number;
  streakDays: number;
  recentActivity: RecentActivity[];
}

interface ItemProgress {
  item: string;
  masteryLevel: number;
  totalAttempts: number;
  correctCount: number;
  accuracy: number;
}

interface RecentActivity {
  date: string;
  moduleType: string;
  activitiesCount: number;
  correctCount: number;
  accuracy: number;
}

export default function ReportsPage() {
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<'numbers' | 'alphabet' | 'all'>('all');

  useEffect(() => {
    fetchReport();
  }, [selectedModule]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const moduleParam = selectedModule !== 'all' ? `&moduleType=${selectedModule}` : '';
      const response = await fetch(`/api/reports/demo-learner?type=full${moduleParam}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Progress Report</h1>
          <div className="flex gap-2">
            {['all', 'numbers', 'alphabet'].map((mod) => (
              <Button
                key={mod}
                variant={selectedModule === mod ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedModule(mod as typeof selectedModule)}
              >
                {mod.charAt(0).toUpperCase() + mod.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-xl text-gray-500">Loading...</div>
        ) : report ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="text-center bg-gradient-to-br from-primary-100 to-primary-200">
                  <CardContent className="pt-6">
                    <div className="text-5xl font-bold text-primary-700">
                      {report.overallMastery}%
                    </div>
                    <div className="text-lg text-primary-600 mt-2">Overall Mastery</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="text-center bg-gradient-to-br from-secondary-100 to-secondary-200">
                  <CardContent className="pt-6">
                    <div className="text-5xl font-bold text-secondary-700">
                      {report.totalSessions}
                    </div>
                    <div className="text-lg text-secondary-600 mt-2">Sessions</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="text-center bg-gradient-to-br from-accent-100 to-accent-200">
                  <CardContent className="pt-6">
                    <div className="text-5xl font-bold text-accent-700">
                      {formatTime(report.totalTimeSpentMs)}
                    </div>
                    <div className="text-lg text-accent-600 mt-2">Time Spent</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="text-center bg-gradient-to-br from-purple-100 to-purple-200">
                  <CardContent className="pt-6">
                    <div className="text-5xl font-bold text-purple-700">
                      {report.streakDays}🔥
                    </div>
                    <div className="text-lg text-purple-600 mt-2">Day Streak</div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Progress by Item</CardTitle>
                <CardDescription>
                  How well each number or letter has been learned
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-4">
                  {report.itemsProgress.map((item) => (
                    <div key={item.item} className="text-center">
                      <div className="text-2xl font-bold mb-2">{item.item}</div>
                      <Progress
                        value={item.masteryLevel}
                        className="h-2"
                        indicatorClassName={
                          item.masteryLevel >= 80
                            ? 'bg-green-500'
                            : item.masteryLevel >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-400'
                        }
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        {item.masteryLevel}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {report.recentActivity.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Learning activity from the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div>
                          <div className="font-medium">
                            {new Date(activity.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-sm text-gray-500">
                            {activity.activitiesCount} activities
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {Math.round(activity.accuracy)}%
                          </div>
                          <div className="text-sm text-gray-500">
                            {activity.correctCount}/{activity.activitiesCount} correct
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="text-center p-12">
            <CardContent>
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-bold mb-2">No data yet!</h2>
              <p className="text-gray-500 mb-6">
                Start learning to see your progress here.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/learn/numbers">
                  <Button>Learn Numbers</Button>
                </Link>
                <Link href="/learn/alphabet">
                  <Button variant="secondary">Learn Alphabet</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
