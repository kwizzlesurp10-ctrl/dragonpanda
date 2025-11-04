'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle, Info } from 'lucide-react';

export default function SetupGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-blue-900 dark:text-blue-100">
                🎉 System Working!
              </CardTitle>
              <Badge variant="default" className="bg-green-500">
                Live Data
              </Badge>
            </div>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              Your trends dashboard is fetching real-time data using intelligent fallback sources
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-900 dark:text-blue-100"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border">
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Automatic Fallback System Active
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  The system uses HackerNews for trending tech topics and multiple GitHub sources for repositories.
                  No API configuration required!
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border">
            <div className="flex items-start gap-2 mb-2">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Optional: Enhanced Features with API Tokens
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Want X (Twitter) trending topics or higher GitHub rate limits? You can optionally configure API tokens in your Supabase dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              How to Add API Tokens (Optional):
            </h4>

            <ol className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">1.</span>
                <div>
                  <p className="font-medium">Go to Supabase Dashboard</p>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    Open Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">2.</span>
                <div>
                  <p>Navigate to: <strong>Edge Functions → Secrets</strong></p>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">3.</span>
                <div>
                  <p className="font-medium mb-1">Add X API Token (Optional):</p>
                  <ul className="ml-4 space-y-1 list-disc">
                    <li>Name: <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">X_BEARER_TOKEN</code></li>
                    <li>Get token from: <a href="https://developer.x.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">developer.x.com</a></li>
                  </ul>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">4.</span>
                <div>
                  <p className="font-medium mb-1">Add GitHub Token (Optional):</p>
                  <ul className="ml-4 space-y-1 list-disc">
                    <li>Name: <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">GITHUB_TOKEN</code></li>
                    <li>Get token from: <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">github.com/settings/tokens</a></li>
                  </ul>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">5.</span>
                <div>
                  <p>Click <strong>Get Updates</strong> button to test the new tokens!</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-800 dark:text-green-300">
              <strong>✨ Pro Tip:</strong> The system works great without any tokens! Only add them if you want X trending topics or need higher GitHub API rate limits.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
