import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BookOpen, 
  Video, 
  Users, 
  Clock, 
  Star, 
  TrendingUp,
  Brain,
  PlayCircle,
  FileText,
  GraduationCap,
  Target,
  CheckCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Filter,
  RefreshCw
} from 'lucide-react';
import { contentRecommendationApi, healthApi } from '../api/skillGap.api';
import { skillGapSocketService } from '../services/skillGap.socket.service';

const RecommendedContentCards = ({ userId, skillGapId = null, userSkillId = null }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    contentType: null,
    algorithm: null,
    difficulty: null,
    priority: null
  });

  // Socket connection for real-time updates
  useEffect(() => {
    // Initialize socket connection when component mounts
    const token = localStorage.getItem('accessToken');
    if (token && userId) {
      skillGapSocketService.initialize(userId, token);
      skillGapService.joinUserRoom(userId);
      skillGapService.joinContentRoom(userId);
    }

    // Add event listeners
    skillGapSocketService.addEventListener('contentRecommendationsGenerated', handleRecommendationsUpdated);
    skillGapSocketService.addEventListener('recommendationStatusUpdated', handleStatusUpdated);

    // Cleanup on unmount
    return () => {
      skillGapSocketService.removeEventListener('contentRecommendationsGenerated', handleRecommendationsUpdated);
      skillGapSocketService.removeEventListener('recommendationStatusUpdated', handleStatusUpdated);
      skillGapService.cleanup();
    };
  }, [userId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const options = {
        skillGapId,
        userSkillId,
        limit: 20
      };
      const response = await contentRecommendationApi.getRecommendations(userId, options);
      setRecommendations(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      setLoading(true);
      const options = {
        skillGapId,
        userSkillId,
        contentTypes: filters.contentType ? [filters.contentType] : undefined,
        algorithm: filters.algorithm || 'HYBRID',
        difficulty: filters.difficulty,
        includeTrending: true,
        limit: 20
      };
      const response = await contentRecommendationApi.generateRecommendations(userId, options);
      setRecommendations(response.data.recommendations);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationsUpdated = (data) => {
    if (data.userId === userId) {
      setRecommendations(data.recommendations);
    }
  };

  const handleStatusUpdated = (data) => {
    if (data.userId === userId) {
      setRecommendations(prev => prev.map(rec => 
        rec.id === data.recommendationId 
          ? { ...rec, status: data.status, rating: data.rating, feedback: data.feedback }
          : rec
      ));
    }
  };

  const updateRecommendationStatus = async (recommendationId, status, metadata = {}) => {
    try {
      await contentRecommendationApi.updateRecommendationStatus(userId, recommendationId, status, metadata);
    } catch (err) {
      setError(err.message);
    }
  };

  const getContentTypeIcon = (contentType) => {
    switch (contentType) {
      case 'COURSE': return <GraduationCap className="h-4 w-4" />;
      case 'TUTORIAL': return <BookOpen className="h-4 w-4" />;
      case 'VIDEO': return <Video className="h-4 w-4" />;
      case 'MENTOR_SESSION': return <Users className="h-4 w-4" />;
      case 'ARTICLE': return <FileText className="h-4 w-4" />;
      case 'PROJECT': return <Target className="h-4 w-4" />;
      case 'EXERCISE': return <PlayCircle className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getContentTypeColor = (contentType) => {
    switch (contentType) {
      case 'COURSE': return 'bg-blue-100 text-blue-800';
      case 'TUTORIAL': return 'bg-green-100 text-green-800';
      case 'VIDEO': return 'bg-purple-100 text-purple-800';
      case 'MENTOR_SESSION': return 'bg-orange-100 text-orange-800';
      case 'ARTICLE': return 'bg-gray-100 text-gray-800';
      case 'PROJECT': return 'bg-red-100 text-red-800';
      case 'EXERCISE': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlgorithmColor = (algorithm) => {
    switch (algorithm) {
      case 'COLLABORATIVE': return 'bg-blue-100 text-blue-800';
      case 'CONTENT_BASED': return 'bg-green-100 text-green-800';
      case 'HYBRID': return 'bg-purple-100 text-purple-800';
      case 'TRENDING': return 'bg-orange-100 text-orange-800';
      case 'PERSONALIZED': return 'bg-pink-100 text-pink-800';
      case 'AI_DRIVEN': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE': return <Eye className="h-4 w-4" />;
      case 'VIEWED': return <Eye className="h-4 w-4" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      case 'DISMISSED': return <ThumbsDown className="h-4 w-4" />;
      case 'EXPIRED': return <Clock className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getFilteredRecommendations = () => {
    let filtered = [...recommendations];

    if (activeTab !== 'all') {
      filtered = filtered.filter(rec => rec.contentType === activeTab);
    }

    if (filters.contentType) {
      filtered = filtered.filter(rec => rec.contentType === filters.contentType);
    }

    if (filters.algorithm) {
      filtered = filtered.filter(rec => rec.algorithm === filters.algorithm);
    }

    if (filters.difficulty) {
      filtered = filtered.filter(rec => rec.difficulty === filters.difficulty);
    }

    if (filters.priority) {
      filtered = filtered.filter(rec => rec.priority === filters.priority);
    }

    return filtered;
  };

  const filteredRecommendations = getFilteredRecommendations();

  if (loading && recommendations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Recommended Content</h3>
          <Button onClick={generateRecommendations} disabled={loading}>
            <Brain className="h-4 w-4 mr-2" />
            Generate Recommendations
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-2 bg-gray-200 rounded w-4/6"></div>
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
          <h3 className="text-lg font-semibold">Recommended Content</h3>
          <p className="text-sm text-muted-foreground">
            Personalized content recommendations based on your skill gaps and learning preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateRecommendations} disabled={loading}>
            <Brain className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : 'Generate New'}
          </Button>
          <Button variant="outline" onClick={fetchRecommendations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Connection Status */}
      {!skillGapSocketService.getConnectionStatus().isConnected && (
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <p className="text-yellow-600">
            Real-time updates are not available. Some features may be delayed.
          </p>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.contentType || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value || null }))}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Content Types</option>
              <option value="COURSE">Courses</option>
              <option value="TUTORIAL">Tutorials</option>
              <option value="VIDEO">Videos</option>
              <option value="ARTICLE">Articles</option>
              <option value="MENTOR_SESSION">Mentor Sessions</option>
              <option value="PROJECT">Projects</option>
              <option value="EXERCISE">Exercises</option>
            </select>

            <select
              value={filters.algorithm || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, algorithm: e.target.value || null }))}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Algorithms</option>
              <option value="HYBRID">Hybrid</option>
              <option value="COLLABORATIVE">Collaborative</option>
              <option value="CONTENT_BASED">Content-Based</option>
              <option value="TRENDING">Trending</option>
              <option value="PERSONALIZED">Personalized</option>
              <option value="AI_DRIVEN">AI-Driven</option>
            </select>

            <select
              value={filters.difficulty || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value || null }))}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Difficulties</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>

            <select
              value={filters.priority || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value || null }))}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Content Type Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Content</TabsTrigger>
          <TabsTrigger value="COURSE">Courses</TabsTrigger>
          <TabsTrigger value="TUTORIAL">Tutorials</TabsTrigger>
          <TabsTrigger value="VIDEO">Videos</TabsTrigger>
          <TabsTrigger value="ARTICLE">Articles</TabsTrigger>
          <TabsTrigger value="MENTOR_SESSION">Sessions</TabsTrigger>
          <TabsTrigger value="PROJECT">Projects</TabsTrigger>
          <TabsTrigger value="EXERCISE">Exercises</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecommendations.map((content) => (
              <Card 
                key={content.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedContent(content)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getContentTypeIcon(content.contentType)}
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">
                          {content.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getContentTypeColor(content.contentType)}>
                            {content.contentType.replace('_', ' ')}
                          </Badge>
                          <Badge className={getAlgorithmColor(content.algorithm)}>
                            {content.algorithm}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(content.status)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Description */}
                  {content.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {content.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Quality Score</span>
                      <div className="flex items-center gap-1">
                        <Progress value={content.qualityScore * 100} className="w-16" />
                        <span>{Math.round(content.qualityScore * 100)}%</span>
                      </div>
                    </div>

                    {content.estimatedDuration && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Duration</span>
                        <span>{content.estimatedDuration} min</span>
                      </div>
                    )}

                    {content.difficulty && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Difficulty</span>
                        <Badge variant="outline">{content.difficulty}</Badge>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span>Personalization</span>
                      <div className="flex items-center gap-1">
                        <Progress value={content.personalizedScore * 100} className="w-16" />
                        <span>{Math.round(content.personalizedScore * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {content.tags && content.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {content.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {content.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{content.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* AI Reasoning */}
                  {content.aiReasoning && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>AI Reasoning:</strong> {content.aiReasoning}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateRecommendationStatus(content.id, 'VIEWED');
                      }}
                      disabled={content.status !== 'ACTIVE'}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateRecommendationStatus(content.id, 'COMPLETED');
                      }}
                      disabled={content.status === 'COMPLETED'}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateRecommendationStatus(content.id, 'DISMISSED');
                      }}
                      disabled={content.status === 'DISMISSED'}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRecommendations.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No recommendations found</h3>
              <p className="text-gray-500 mt-2">
                Try adjusting your filters or generating new recommendations.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Content Detail Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getContentTypeIcon(selectedContent.contentType)}
                  <div>
                    <CardTitle className="text-xl">{selectedContent.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getContentTypeColor(selectedContent.contentType)}>
                        {selectedContent.contentType.replace('_', ' ')}
                      </Badge>
                      <Badge className={getAlgorithmColor(selectedContent.algorithm)}>
                        {selectedContent.algorithm}
                      </Badge>
                      <Badge variant={getPriorityColor(selectedContent.priority)}>
                        {selectedContent.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedContent(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Description */}
              {selectedContent.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm">{selectedContent.description}</p>
                </div>
              )}

              {/* Learning Outcomes */}
              {selectedContent.learningOutcomes && selectedContent.learningOutcomes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Learning Outcomes</h4>
                  <ul className="space-y-1">
                    {selectedContent.learningOutcomes.map((outcome, index) => (
                      <li key={index} className="text-sm">• {outcome}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prerequisites */}
              {selectedContent.prerequisites && selectedContent.prerequisites.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Prerequisites</h4>
                  <ul className="space-y-1">
                    {selectedContent.prerequisites.map((prereq, index) => (
                      <li key={index} className="text-sm">• {prereq}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tags */}
              {selectedContent.tags && selectedContent.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedContent.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Quality Score</h4>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedContent.qualityScore * 100} />
                    <span>{Math.round(selectedContent.qualityScore * 100)}%</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Personalization</h4>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedContent.personalizedScore * 100} />
                    <span>{Math.round(selectedContent.personalizedScore * 100)}%</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Recommendation Score</h4>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedContent.recommendationScore * 100} />
                    <span>{Math.round(selectedContent.recommendationScore * 100)}%</span>
                  </div>
                </div>
                {selectedContent.trendingScore && (
                  <div>
                    <h4 className="font-medium mb-2">Trending Score</h4>
                    <div className="flex items-center gap-2">
                      <Progress value={selectedContent.trendingScore * 100} />
                      <span>{Math.round(selectedContent.trendingScore * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Reasoning */}
              {selectedContent.aiReasoning && (
                <div>
                  <h4 className="font-medium mb-2">AI Reasoning</h4>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm">{selectedContent.aiReasoning}</p>
                  </div>
                </div>
              )}

              {/* Context Factors */}
              {selectedContent.contextFactors && Object.keys(selectedContent.contextFactors).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Context Factors</h4>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <pre className="text-xs">{JSON.stringify(selectedContent.contextFactors, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => updateRecommendationStatus(selectedContent.id, 'VIEWED')}
                  disabled={selectedContent.status !== 'ACTIVE'}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Mark as Viewed
                </Button>
                
                <Button 
                  onClick={() => updateRecommendationStatus(selectedContent.id, 'COMPLETED')}
                  disabled={selectedContent.status === 'COMPLETED'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Completed
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => updateRecommendationStatus(selectedContent.id, 'DISMISSED')}
                  disabled={selectedContent.status === 'DISMISSED'}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RecommendedContentCards;
