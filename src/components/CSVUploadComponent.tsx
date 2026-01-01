"use client";

import { useState, useRef, ChangeEvent } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBox, CustomLoader } from "@/components";
import { Upload } from "lucide-react";

interface CSVUploadComponentProps {
  onUploadSuccess?: (result: Record<string, unknown>) => void;
  isBank?: boolean;
}

export default function CSVUploadComponent({
  onUploadSuccess,
  isBank = true,
}: CSVUploadComponentProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (
        file.type !== "text/csv" &&
        !file.name.toLowerCase().endsWith(".csv")
      ) {
        setError("Please select a valid CSV file");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit");
        return;
      }

      setSelectedFile(file);
      setError(null);
      setUploadResult(null);

      // Auto upload
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("csv_file", file);
      formData.append("is_bank", isBank ? "1" : "0");

      const result = await apiRequest("upload-csv", "POST", formData);

      if (!result.success) {
        throw new Error(result.message || "Upload failed");
      }

      setUploadResult(
        (result.data as Record<string, unknown>) ||
          (result as Record<string, unknown>),
      );
      if (onUploadSuccess) {
        onUploadSuccess(result.data as Record<string, unknown>);
      }

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full h-full">
      <CardContent className="p-0">
        <div className="relative w-full">
          <Label
            htmlFor="csv-upload"
            className={`
              flex flex-col items-center justify-center w-full h-64 
              border-2 border-dashed rounded-lg cursor-pointer 
              transition-all duration-200
              ${isUploading ? "bg-muted/50 border-muted-foreground/50" : "hover:bg-muted/50 border-muted-foreground/25 hover:border-primary/50"}
              ${error ? "border-destructive/50 bg-destructive/5" : ""}
              ${uploadResult ? "border-green-500/50 bg-green-50/50" : ""}
            `}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <CustomLoader minimal />
                  <p className="text-sm font-medium text-muted-foreground">
                    Uploading...
                  </p>
                </div>
              ) : (
                <>
                  <Upload
                    className={`w-12 h-12 mb-3 ${selectedFile ? "text-primary" : "text-muted-foreground"}`}
                  />
                  {selectedFile ? (
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-medium">
                      Click to upload CSV
                    </p>
                  )}
                </>
              )}
            </div>
          </Label>
          <Input
            id="csv-upload"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            disabled={isUploading}
          />
        </div>

        {(error || uploadResult) && (
          <div className="p-4 space-y-2">
            {error && <AlertBox type="error" title={error} />}
            {uploadResult && (
              <AlertBox
                type="success"
                title={`Uploaded ${uploadResult.total_questions || "some"} questions. ID: ${uploadResult.file_id}`}
              />
            )}

            {selectedFile && !isUploading && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedFile(null);
                    setUploadResult(null);
                    setError(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
