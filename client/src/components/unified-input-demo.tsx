import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UnifiedInput } from "@/components/ui/unified-input";

interface DemoFormData {
  name: string;
  mobile: string;
  weight: string;
  amount: string;
  email: string;
}

export function UnifiedInputDemo() {
  const { register, handleSubmit, watch, setValue } = useForm<DemoFormData>();
  const [result, setResult] = useState<DemoFormData | null>(null);

  const onSubmit = (data: DemoFormData) => {
    setResult(data);
  };

  const formData = watch();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modern Unified Input Component Demo</CardTitle>
          <p className="text-sm text-gray-600">
            Single input field with typing + voice functionality - Mobile friendly
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Text Input */}
              <div className="space-y-2">
                <Label>Farmer Name (Text)</Label>
                <UnifiedInput
                  {...register("name")}
                  placeholder="Type or speak farmer name..."
                  type="text"
                  voiceType="text"
                />
                <p className="text-xs text-gray-500">Voice recognizes names in English, Hindi, Kannada</p>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <Label>Mobile Number (Phone)</Label>
                <UnifiedInput
                  {...register("mobile")}
                  placeholder="Type or speak mobile number..."
                  type="tel"
                  voiceType="tel"
                />
                <p className="text-xs text-gray-500">Voice extracts only digits from spoken numbers</p>
              </div>

              {/* Number Input */}
              <div className="space-y-2">
                <Label>Weight in KG (Number)</Label>
                <UnifiedInput
                  {...register("weight")}
                  placeholder="Type or speak weight..."
                  type="number"
                  voiceType="number"
                />
                <p className="text-xs text-gray-500">Voice converts "thirty-eight point five" → "38.5"</p>
              </div>

              {/* Currency Input */}
              <div className="space-y-2">
                <Label>Amount (Currency)</Label>
                <UnifiedInput
                  {...register("amount")}
                  placeholder="Type or speak amount..."
                  type="text"
                  voiceType="currency"
                />
                <p className="text-xs text-gray-500">Voice converts spoken numbers to currency format</p>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label>Email Address</Label>
                <UnifiedInput
                  {...register("email")}
                  placeholder="Type or speak email..."
                  type="email"
                  voiceType="text"
                />
                <p className="text-xs text-gray-500">Voice converts "name at domain dot com" → "name@domain.com"</p>
              </div>

              {/* Disabled Input */}
              <div className="space-y-2">
                <Label>Disabled Input</Label>
                <UnifiedInput
                  placeholder="This field is disabled..."
                  disabled
                />
                <p className="text-xs text-gray-500">Voice button hidden when disabled</p>
              </div>

            </div>

            <Button type="submit" className="w-full">
              Submit Demo Form
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Form Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Submit Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Form Submission Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 p-4 rounded-lg">
              <pre className="text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>Unified Input Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">✓ What Works</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Single input field (no dual inputs)</li>
                <li>• Integrated microphone button</li>
                <li>• Type OR speak - your choice</li>
                <li>• Mobile-friendly touch interface</li>
                <li>• Trilingual voice recognition</li>
                <li>• Smart text processing by type</li>
                <li>• React Hook Form compatibility</li>
                <li>• Visual feedback (listening/processing)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">🎯 Voice Processing</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Numbers: "thirty-eight" → "38"</li>
                <li>• Decimals: "point five" → ".5"</li>
                <li>• Phone: extracts digits only</li>
                <li>• Email: "at" → "@", "dot" → "."</li>
                <li>• Hindi: "तीस" → "30"</li>
                <li>• Kannada: "ಮೂವತ್ತು" → "30"</li>
                <li>• Auto-stops after processing</li>
                <li>• Error handling with retry</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}