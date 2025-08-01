import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Database, Server } from "lucide-react";

interface ApiTestResponse {
  message: string;
  timestamp: string;
  database: string;
}

interface DbTestResponse {
  message: string;
  timestamp: string;
}

export default function BackendTest() {
  // Test basic API connection
  const { data: apiTest, isLoading: apiLoading, error: apiError, refetch: refetchApi } = useQuery<ApiTestResponse>({
    queryKey: ['/api/test'],
    retry: 1,
  });

  // Test database connection
  const dbTestMutation = useMutation<DbTestResponse>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/test-db');
      return response.json();
    },
  });

  const handleDbTest = () => {
    dbTestMutation.mutate();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Backend Connection Test</h1>
        <p className="text-muted-foreground">
          Testing connection to backend API and database
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* API Connection Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              API Connection
            </CardTitle>
            <CardDescription>
              Testing connection to backend API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              {apiLoading ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Testing...
                </Badge>
              ) : apiError ? (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              ) : (
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>

            {apiTest && (
              <div className="space-y-2 text-sm">
                <div><strong>Message:</strong> {apiTest.message}</div>
                <div><strong>Timestamp:</strong> {apiTest.timestamp}</div>
                <div><strong>Database:</strong> {apiTest.database}</div>
              </div>
            )}

            {apiError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                <strong>Error:</strong> {apiError.message}
              </div>
            )}

            <Button onClick={() => refetchApi()} variant="outline" size="sm">
              Test Again
            </Button>
          </CardContent>
        </Card>

        {/* Database Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Connection
            </CardTitle>
            <CardDescription>
              Testing PostgreSQL database connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              {dbTestMutation.isPending ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Testing...
                </Badge>
              ) : dbTestMutation.isError ? (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              ) : dbTestMutation.isSuccess ? (
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Not Tested
                </Badge>
              )}
            </div>

            {dbTestMutation.data && (
              <div className="space-y-2 text-sm">
                <div><strong>Message:</strong> {dbTestMutation.data.message}</div>
                <div><strong>Timestamp:</strong> {dbTestMutation.data.timestamp}</div>
              </div>
            )}

            {dbTestMutation.error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                <strong>Error:</strong> {dbTestMutation.error.message}
              </div>
            )}

            <Button 
              onClick={handleDbTest} 
              disabled={dbTestMutation.isPending}
              size="sm"
            >
              {dbTestMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Testing...
                </>
              ) : (
                'Test Database'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div><strong>API URL:</strong> {import.meta.env.VITE_API_URL || 'Using relative URLs'}</div>
            <div><strong>Mode:</strong> {import.meta.env.MODE}</div>
            <div><strong>Dev:</strong> {import.meta.env.DEV ? 'Yes' : 'No'}</div>
            <div><strong>Prod:</strong> {import.meta.env.PROD ? 'Yes' : 'No'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}