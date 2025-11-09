import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import * as Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportResult {
  success: number;
  failed: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface DuplicateGame {
  rowIndex: number;
  csvData: any;
  existingGame: any;
  title: string;
  action: 'skip' | 'update' | 'import';
}

interface CSVImportProps {
  onImportComplete?: () => void;
}

export const CSVImport = ({ onImportComplete }: CSVImportProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGame[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [isProcessingDuplicates, setIsProcessingDuplicates] = useState(false);

  const gameFields = [
    { key: "title", label: "Title", required: true },
    { key: "platform_name", label: "Platform Name", required: true },
    { key: "playthrough_platform_name", label: "Playthrough Platform Name", required: true },
    { key: "is_currently_playing", label: "Currently Playing", required: false },
    { key: "is_completed", label: "Completed", required: false },
    { key: "needs_purchase", label: "Needs Purchase", required: false },
    { key: "tosort", label: "To Sort", required: false },
    { key: "estimated_duration", label: "Estimated Duration (hours)", required: false },
    { key: "actual_playtime", label: "Actual Playtime (hours)", required: false },
    { key: "completion_date", label: "Completion Date", required: false },
    { key: "price", label: "Price", required: false },
    { key: "achievements", label: "Achievements", required: false },
    { key: "comment", label: "Comment", required: false },
    { key: "retro_achievement_url", label: "RetroAchievements URL", required: false },
    { key: "how_long_to_beat_url", label: "HowLongToBeat URL", required: false },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setFile(uploadedFile);
    
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("CSV parsing complete:", results);
        
        if (results.errors.length > 0) {
          console.error("CSV parse errors:", results.errors);
          toast({
            title: "CSV Parse Error",
            description: results.errors[0].message,
            variant: "destructive",
          });
          return;
        }

        // Filter out empty rows
        const validData = results.data.filter((row: any) => 
          row && Object.values(row).some(value => value && String(value).trim() !== '')
        );

        console.log("Valid CSV data:", validData.length, "rows");
        setCsvData(validData);
        
        if (validData.length > 0) {
          setHeaders(Object.keys(validData[0] || {}));
          
          // Auto-map fields based on common names
          const autoMapping: Record<string, string> = {};
          Object.keys(validData[0] || {}).forEach(header => {
            const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const matchingField = gameFields.find(field => 
              field.key.toLowerCase().includes(lowerHeader) || 
              lowerHeader.includes(field.key.toLowerCase().replace('_', ''))
            );
            if (matchingField) {
              autoMapping[header] = matchingField.key;
            }
          });
          setFieldMapping(autoMapping);
        }

        toast({
          title: "File Parsed",
          description: `Found ${validData.length} rows to import.`,
        });
      },
      error: (error) => {
        console.error("Papa parse error:", error);
        toast({
          title: "Parse Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleFieldMapping = (csvHeader: string, gameField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvHeader]: gameField === "skip" ? "" : gameField
    }));
  };

  const checkForDuplicates = async () => {
    if (!user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: platformsData } = await supabase
        .from('platforms')
        .select('id, name');

      const { data: existingGames } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id);

      const foundDuplicates: DuplicateGame[] = [];

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        
        // Get title from mapped field
        const titleHeader = Object.entries(fieldMapping).find(([_, field]) => field === 'title')?.[0];
        const title = titleHeader ? row[titleHeader] : null;

        if (!title?.trim()) continue;

        // Check for existing game with same title
        const existingGame = existingGames?.find(g => 
          g.title.toLowerCase().trim() === title.toLowerCase().trim()
        );

        if (existingGame) {
          foundDuplicates.push({
            rowIndex: i,
            csvData: row,
            existingGame,
            title: title.trim(),
            action: 'skip'
          });
        }

        setUploadProgress(((i + 1) / csvData.length) * 50);
      }

      if (foundDuplicates.length > 0) {
        setDuplicates(foundDuplicates);
        setShowDuplicateDialog(true);
        setIsUploading(false);
      } else {
        // No duplicates, proceed with import
        await performImport();
      }
    } catch (error: any) {
      console.error("Duplicate check failed:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  const performImport = async () => {
    if (!user) return;

    setIsProcessingDuplicates(true);
    setShowDuplicateDialog(false);
    setUploadProgress(50);
    setImportResult(null);

    try {
      const { data: platformsData } = await supabase
        .from('platforms')
        .select('id, name');

      const errors: string[] = [];
      let successCount = 0;
      let failedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        
        // Check if this row has a duplicate action
        const duplicate = duplicates.find(d => d.rowIndex === i);
        
        if (duplicate?.action === 'skip') {
          skippedCount++;
          setUploadProgress(50 + ((i + 1) / csvData.length) * 50);
          continue;
        }

        try {
          const gameData: any = {
            user_id: user.id,
          };

          // Map fields from CSV to game data
          Object.entries(fieldMapping).forEach(([csvHeader, gameField]) => {
            if (gameField && row[csvHeader] !== undefined && row[csvHeader] !== null) {
              const value = row[csvHeader];
              
              switch (gameField) {
                case 'title':
                  gameData.title = value;
                  break;
                  
                case 'platform_name':
                  const platform = platformsData?.find(p => 
                    p.name.toLowerCase() === value.toLowerCase()
                  );
                  if (platform) gameData.platform = platform.id;
                  break;
                
                case 'playthrough_platform_name':
                  const playthroughPlatform = platformsData?.find(p => 
                    p.name.toLowerCase() === value.toLowerCase()
                  );
                  if (playthroughPlatform) gameData.playthrough_platform = playthroughPlatform.id;
                  break;
                
                case 'is_currently_playing':
                case 'is_completed':
                case 'needs_purchase':
                case 'tosort':
                  gameData[gameField] = String(value).toLowerCase() === 'true';
                  break;
                
                case 'estimated_duration':
                case 'actual_playtime':
                case 'achievements':
                  const numValue = parseInt(String(value));
                  if (!isNaN(numValue)) gameData[gameField] = numValue;
                  break;
                
                case 'price':
                  const priceValue = parseFloat(String(value));
                  if (!isNaN(priceValue)) gameData[gameField] = priceValue;
                  break;
                
                case 'completion_date':
                  if (value && new Date(String(value)).toString() !== 'Invalid Date') {
                    gameData[gameField] = String(value);
                  }
                  break;
                
                default:
                  gameData[gameField] = String(value);
              }
            }
          });

          if (!gameData.title?.trim()) {
            errors.push(`Row ${i + 1}: Title is required`);
            failedCount++;
            continue;
          }

          if (duplicate?.action === 'update') {
            // Update existing game
            const { error } = await supabase
              .from('games')
              .update(gameData)
              .eq('id', duplicate.existingGame.id);

            if (error) {
              errors.push(`Row ${i + 1}: Update failed - ${error.message}`);
              failedCount++;
            } else {
              updatedCount++;
            }
          } else {
            // Insert new game
            const { error } = await supabase
              .from('games')
              .insert([gameData]);

            if (error) {
              errors.push(`Row ${i + 1}: ${error.message}`);
              failedCount++;
            } else {
              successCount++;
            }
          }
        } catch (error: any) {
          errors.push(`Row ${i + 1}: ${error.message}`);
          failedCount++;
        }

        setUploadProgress(50 + ((i + 1) / csvData.length) * 50);
      }

      setImportResult({
        success: successCount,
        failed: failedCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors.slice(0, 10)
      });

      const totalProcessed = successCount + updatedCount;
      if (totalProcessed > 0) {
        toast({
          title: "Import Complete",
          description: `Imported: ${successCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}${failedCount > 0 ? `, Failed: ${failedCount}` : ''}`,
        });
        onImportComplete?.();
      } else {
        toast({
          title: "Import Complete",
          description: `Skipped: ${skippedCount}${failedCount > 0 ? `, Failed: ${failedCount}` : ''}`,
        });
      }

    } catch (error: any) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsProcessingDuplicates(false);
    }
  };

  const handleDuplicateAction = (rowIndex: number, action: 'skip' | 'update' | 'import') => {
    setDuplicates(prev => prev.map(d => 
      d.rowIndex === rowIndex ? { ...d, action } : d
    ));
  };

  const handleApplyActionToAll = (action: 'skip' | 'update' | 'import') => {
    setDuplicates(prev => prev.map(d => ({ ...d, action })));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="csvFile">Upload CSV File</Label>
        <Input
          id="csvFile"
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="bg-background border-border"
        />
      </div>

      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Field Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your CSV columns to game fields. Title field is required.
            </p>
            
            <div className="grid gap-4">
              {headers.map((header) => (
                <div key={header} className="grid grid-cols-2 gap-4 items-center">
                  <Label className="text-sm font-medium">{header}</Label>
                  <Select
                    value={fieldMapping[header] || ""}
                    onValueChange={(value) => handleFieldMapping(header, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip this column</SelectItem>
                      {gameFields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label} {field.required && "*"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {csvData.length > 0 && (
        <div className="space-y-4">
          {isUploading && (
            <div className="space-y-2">
              <Label>Import Progress</Label>
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground">
                Processing row {Math.ceil((uploadProgress / 100) * csvData.length)} of {csvData.length}
              </p>
            </div>
          )}

          <Button
            onClick={checkForDuplicates}
            disabled={isUploading || isProcessingDuplicates || !['title', 'platform_name', 'playthrough_platform_name'].every(field => Object.values(fieldMapping).includes(field))}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading || isProcessingDuplicates ? "Processing..." : `Import ${csvData.length} Games`}
          </Button>
        </div>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(importResult.success > 0 || importResult.updated > 0) && importResult.failed === 0 && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {importResult.failed > 0 && importResult.success === 0 && importResult.updated === 0 && (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {(importResult.success > 0 || importResult.updated > 0) && importResult.failed > 0 && (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-green-600 dark:text-green-400">
                ✓ Imported: {importResult.success}
              </div>
              <div className="text-blue-600 dark:text-blue-400">
                ↻ Updated: {importResult.updated}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                ⊘ Skipped: {importResult.skipped}
              </div>
              <div className="text-red-600 dark:text-red-400">
                ✗ Failed: {importResult.failed}
              </div>
            </div>
            
            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Errors:</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Duplicate Games Found</DialogTitle>
            <DialogDescription>
              {duplicates.length} game{duplicates.length !== 1 ? 's' : ''} already exist in your library. Choose what to do with each one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2 pb-2 border-b">
              <Button size="sm" variant="outline" onClick={() => handleApplyActionToAll('skip')}>
                Skip All
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleApplyActionToAll('update')}>
                Update All
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleApplyActionToAll('import')}>
                Import All as New
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {duplicates.map((duplicate) => (
                  <Card key={duplicate.rowIndex}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm mb-1">{duplicate.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            Existing game found in your library
                          </p>
                        </div>

                        <RadioGroup
                          value={duplicate.action}
                          onValueChange={(value) => handleDuplicateAction(duplicate.rowIndex, value as 'skip' | 'update' | 'import')}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="skip" id={`skip-${duplicate.rowIndex}`} />
                            <Label htmlFor={`skip-${duplicate.rowIndex}`} className="text-sm font-normal cursor-pointer">
                              Skip - Don't import this game
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="update" id={`update-${duplicate.rowIndex}`} />
                            <Label htmlFor={`update-${duplicate.rowIndex}`} className="text-sm font-normal cursor-pointer">
                              Update - Replace existing game data with CSV data
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="import" id={`import-${duplicate.rowIndex}`} />
                            <Label htmlFor={`import-${duplicate.rowIndex}`} className="text-sm font-normal cursor-pointer">
                              Import as New - Create a duplicate entry
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowDuplicateDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={performImport} className="flex-1">
                Continue Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};