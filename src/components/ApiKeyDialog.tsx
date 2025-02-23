import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Key, Loader2, Shield, Info, Check, X, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { storeApiKey, ApiKeySchema, getApiKey, removeApiKey } from '@/lib/crypto';
import { cn } from '@/lib/utils';

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApiKeyDialog({ open, onOpenChange, onSuccess }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();
  const existingKey = getApiKey();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      storeApiKey(apiKey);
      toast({
        title: "API Key Saved",
        description: "Your API key has been securely stored in your browser.",
      });
      onSuccess();
      onOpenChange(false);
      setApiKey('');
      setShowKey(false);
    } catch (error) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid OpenAI API key.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveKey = () => {
    removeApiKey();
    toast({
      title: "API Key Removed",
      description: "Your API key has been removed from storage.",
    });
    setApiKey('');
    setShowKey(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Key className="h-5 w-5 text-orange-600" />
            </div>
            <DialogTitle className="text-xl">OpenAI API Key Configuration</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {existingKey ? 
              "Update or remove your stored API key" :
              "Enter your API key to start generating presentations"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 bg-blue-50 border-y border-blue-100">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-1">Local Storage Only</p>
              <p className="text-sm text-blue-700">
                Your API key is stored securely in your browser and is never transmitted to our servers.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={cn(
                  "font-mono pr-10",
                  "border-gray-200 focus:border-orange-500/30 focus:ring-orange-500/20",
                  "bg-white"
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Shield className="h-3 w-3" />
              <span>Get your API key from</span>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 underline"
              >
                OpenAI Platform
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              {existingKey && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveKey}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove Key
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setApiKey('');
                  setShowKey(false);
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !apiKey.trim()}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {existingKey ? 'Update' : 'Save'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 