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

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
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

  const validateAndImport = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to import data. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    console.log("Starting import with user:", user?.id);

    // Check if required fields are mapped
    const requiredFields = ['title', 'platform_name', 'playthrough_platform_name'];
    const missingFields = requiredFields.filter(field => 
      !Object.values(fieldMapping).includes(field)
    );
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please map these required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setImportResult(null);

    try {
      console.log("Fetching platforms...");
      // Fetch platforms for name-to-ID mapping
      const { data: platformsData, error: platformsError } = await supabase
        .from('platforms')
        .select('id, name');
      
      if (platformsError) {
        console.error("Platform fetch error:", platformsError);
        throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
      }
      
      console.log("Platforms fetched:", platformsData?.length || 0);

      const errors: string[] = [];
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        
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

          console.log(`Inserting row ${i + 1}:`, gameData);
          
          const { error } = await supabase
            .from('games')
            .insert([gameData]);

          if (error) {
            console.error(`Row ${i + 1} insert error:`, error);
            errors.push(`Row ${i + 1}: ${error.message}`);
            failedCount++;
          } else {
            console.log(`Row ${i + 1} inserted successfully`);
            successCount++;
          }
        } catch (error: any) {
          console.error(`Row ${i + 1} processing error:`, error);
          errors.push(`Row ${i + 1}: ${error.message}`);
          failedCount++;
        }

        setUploadProgress(((i + 1) / csvData.length) * 100);
      }

      setImportResult({
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10) // Limit to first 10 errors
      });

      if (successCount > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${successCount} games${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
        });
        onImportComplete?.();
      } else {
        toast({
          title: "Import Failed",
          description: "No games were imported successfully.",
          variant: "destructive",
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
    }
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
            onClick={validateAndImport}
            disabled={isUploading || !['title', 'platform_name', 'playthrough_platform_name'].every(field => Object.values(fieldMapping).includes(field))}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Importing..." : `Import ${csvData.length} Games`}
          </Button>
        </div>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success > 0 && importResult.failed === 0 && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {importResult.failed > 0 && importResult.success === 0 && (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {importResult.success > 0 && importResult.failed > 0 && (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-green-600 dark:text-green-400">
                ✓ Successful: {importResult.success}
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
    </div>
  );
};