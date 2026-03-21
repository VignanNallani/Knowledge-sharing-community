import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Target,
  Brain,
  BarChart3,
  Lightbulb,
  BookOpen,
  Users,
  Calendar,
  Award
} from 'lucide-react';
import { skillGapApi, healthApi } from '../api/skillGap.api';
import { skillGapSocketService } from '../services/skillGap.socket.service';

const SkillGapDashboard = ({ userId }) => {
  const [skillGaps, setSkillGaps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGap, setSelectedGap] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Socket connection for real-time updates
  useEffect(() => {
    // Initialize socket connection when component mounts
    const token = localStorage.getItem('accessToken');
    if (token && userId) {
      skillGapSocketService.initialize(userId, token);
      skillGapSocketService.joinUserRoom(userId);
      skillGapSocketService.joinSkillGapRoom(userId);
    }

    // Add event listeners
    skillGapSocketService.addEventListener('skillGapsAnalyzed', handleSkillGapsUpdated);
    skillGapSocketService.addEventListener('skillGapProgressUpdated', handleProgressUpdated);
    skillGapSocketService.addEventListener('skillGapClosed', handleGapClosed);

    // Cleanup on unmount
    return () => {
      skillGapSocketService.removeEventListener('skillGapsAnalyzed', handleSkillGapsUpdated);
      skillGapService.removeEventListener('skillGapProgressUpdated', handleProgressUpdated);
      skillGapService.removeEventListener('skillGapClosed', handleGapClosed);
      skillGapService.cleanup();
    };
  }, [userId]);

  const fetchSkillGaps = async () => {
    try {
      setLoading(true);
      const response = await skillGapApi.getSkillGaps(userId);
      setSkillGaps(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await skillGapApi.getAnalytics(userId);
      setAnalytics(response.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const handleSkillGapsUpdated = (data) => {
    if (data.userId === userId) {
      setSkillGaps(data.gaps);
    }
  };

  const handleProgressUpdated = (data) => {
    if (data.userId === userId) {
      setSkillGaps(prev => prev.map(gap => 
        gap.id === data.gapId 
          ? { ...gap, progressTracker: data.progress, status: data.status }
          : gap
      ));
    }
  };

  const handleGapClosed = (data) => {
    if (data.userId === userId) {
      setSkillGaps(prev => prev.map(gap => 
        gap.id === data.gapId 
          ? { ...gap, status: 'CLOSED', completedAt: new Date() }
          : gap
      ));
    }
  };

  const analyzeSkillGaps = async () => {
    try {
      setLoading(true);
      await skillGapApi.analyzeSkillGaps(userId, {
        includeHistorical: true,
        predictFutureNeeds: true
      });
      await fetchSkillGaps();
      await fetchAnalytics();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateGapProgress = async (gapId, progressValue) => {
    try {
      await skillGapApi.updateGapProgress(userId, gapId, { progressValue });
    } catch (err) {
      setError(err.message);
    }
  };

  const closeGap = async (gapId, reason) => {
    try {
      await skillGapApi.closeGap(userId, gapId, { reason });
    } catch (err) {
      setError(err.message);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'default';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'IMMEDIATE': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE': return <AlertCircle className="h-4 w-4" />;
      case 'ADDRESSING': return <Clock className="h-4 w-4" />;
      case 'CLOSED': return <CheckCircle className="h-4 w-4" />;
      case 'IGNORED': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getGapTypeIcon = (type) => {
    switch (type) {
      case 'MISSING_SKILL': return <Target className="h-4 w-4" />;
      case 'UNDERDEVELOPED': return <TrendingDown className="h-4 w-4" />;
      case 'OUTDATED': return <Clock className="h-4 w-4" />;
      case 'PREREQUISITE': return <BookOpen className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading && skillGaps.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Skill Gap Analysis</h2>
          <p className="text-muted-foreground">
            AI-powered analysis of your skill gaps and personalized recommendations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={analyzeSkillGaps} disabled={loading}>
            <Brain className="h-4 w-4 mr-2" />
            {loading ? 'Analyzing...' : 'Re-analyze Gaps'}
          </Button>
          <Button variant="outline" onClick={fetchSkillGaps}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Connection Status */}
      {!skillGapSocketService.getConnectionStatus().isConnected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Real-time updates are not available. Some features may be delayed.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gaps</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalGaps}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.criticalGaps} critical
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closure Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(analytics.closureRate * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time to Close</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(analytics.averageTimeToClose / 24)}d
              </div>
              <p className="text-xs text-muted-foreground">
                Days average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.gapsByUrgency?.HIGH || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Urgent gaps
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gaps">Skill Gaps</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Critical Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Critical Skill Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skillGaps
                  .filter(gap => gap.gapSeverity === 'CRITICAL')
                  .slice(0, 3)
                  .map(gap => (
                    <div key={gap.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getGapTypeIcon(gap.gapType)}
                        <div>
                          <h4 className="font-medium">{gap.skillName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {gap.gapType.replace('_', ' ').toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(gap.gapSeverity)}>
                          {gap.gapSeverity}
                        </Badge>
                        <Badge variant={getUrgencyColor(gap.urgency)}>
                          {gap.urgency}
                        </Badge>
                        <Progress 
                          value={gap.progressTracker * 100} 
                          className="w-20"
                        />
                      </div>
                    </div>
                  ))}
                {skillGaps.filter(gap => gap.gapSeverity === 'CRITICAL').length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No critical skill gaps detected. Great job!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.gapsBySeverity && (
                  <div className="space-y-3">
                    {Object.entries(analytics.gapsBySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <span className="capitalize">{severity.toLowerCase()}</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(count / analytics.totalGaps) * 100} 
                            className="w-24"
                          />
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gap Types</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.gapsByType && (
                  <div className="space-y-3">
                    {Object.entries(analytics.gapsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="capitalize">{type.replace('_', ' ').toLowerCase()}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Skill Gaps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skillGaps.map(gap => (
                  <div 
                    key={gap.id} 
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedGap(gap)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(gap.status)}
                        <div>
                          <h4 className="font-medium">{gap.skillName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {gap.gapType.replace('_', ' ').toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(gap.gapSeverity)}>
                          {gap.gapSeverity}
                        </Badge>
                        <Badge variant={getUrgencyColor(gap.urgency)}>
                          {gap.urgency}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current Level</span>
                        <span>{Math.round(gap.currentLevel * 100)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Required Level</span>
                        <span>{Math.round(gap.requiredLevel * 100)}%</span>
                      </div>
                      <Progress 
                        value={gap.progressTracker * 100} 
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(gap.progressTracker * 100)}%</span>
                      </div>
                    </div>

                    {gap.recommendedActions && gap.recommendedActions.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Recommended Actions:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {gap.recommendedActions.slice(0, 3).map((action, index) => (
                            <li key={index}>• {action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Gap Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.progressTrends && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Progress trends over time
                    </p>
                    {/* Add chart component here */}
                    <div className="h-40 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-muted-foreground">Chart component</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Impact Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.impactDistribution && (
                  <div className="space-y-3">
                    {Object.entries(analytics.impactDistribution).map(([impact, value]) => (
                      <div key={impact} className="flex items-center justify-between">
                        <span className="capitalize">{impact.toLowerCase()}</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={value * 100} 
                            className="w-24"
                          />
                          <span className="text-sm font-medium">{Math.round(value * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    AI-powered insights based on your learning patterns and skill gaps
                  </AlertDescription>
                </Alert>
                
                {/* Add AI insights content here */}
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Learning Strategy</h4>
                    <p className="text-sm text-muted-foreground">
                      Based on your learning history, you learn best with visual content and hands-on projects.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Growth Opportunities</h4>
                    <p className="text-sm text-muted-foreground">
                      Focus on closing critical gaps first for maximum career impact.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Time Investment</h4>
                    <p className="text-sm text-muted-foreground">
                      Estimated {analytics?.timeInvestment || 'N/A'} hours to close all active gaps.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Gap Detail Modal */}
      {selectedGap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getGapTypeIcon(selectedGap.gapType)}
                {selectedGap.skillName}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedGap(null)}
              >
                ×
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gap Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Gap Type</h4>
                  <Badge variant="outline">
                    {selectedGap.gapType.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Severity</h4>
                  <Badge variant={getSeverityColor(selectedGap.gapSeverity)}>
                    {selectedGap.gapSeverity}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Urgency</h4>
                  <Badge variant={getUrgencyColor(selectedGap.urgency)}>
                    {selectedGap.urgency}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Impact Score</h4>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedGap.impactScore * 100} className="w-20" />
                    <span className="text-sm">{Math.round(selectedGap.impactScore * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div>
                <h4 className="font-medium mb-2">Progress</h4>
                <div className="space-y-2">
                  <Progress value={selectedGap.progressTracker * 100} />
                  <div className="flex justify-between text-sm">
                    <span>Current: {Math.round(selectedGap.currentLevel * 100)}%</span>
                    <span>Target: {Math.round(selectedGap.requiredLevel * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <h4 className="font-medium mb-2">Recommended Actions</h4>
                <ul className="space-y-1">
                  {selectedGap.recommendedActions?.map((action, index) => (
                    <li key={index} className="text-sm">• {action}</li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => updateGapProgress(selectedGap.id, Math.min(selectedGap.progressTracker + 0.1, 1))}
                  disabled={selectedGap.status === 'CLOSED'}
                >
                  Update Progress
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => closeGap(selectedGap.id, 'COMPLETED')}
                  disabled={selectedGap.status === 'CLOSED'}
                >
                  Mark as Completed
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SkillGapDashboard;
