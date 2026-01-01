"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertBox, CustomLoader } from "@/components";
import { Plus, ImageIcon, X } from "lucide-react";
import type { Question } from "@/lib/types";

interface QuestionEditorProps {
  file_id: string;
  exam_id?: string;
  initialQuestion?: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

export default function QuestionEditor({
  file_id,
  exam_id,
  initialQuestion,
  onSave,
  onCancel,
}: QuestionEditorProps) {
  const [formData, setFormData] = useState<Question>({
    file_id: file_id,
    exam_id: exam_id,
    question: initialQuestion?.question || initialQuestion?.question_text || "",
    question_text:
      initialQuestion?.question_text || initialQuestion?.question || "",
    options: initialQuestion?.options || [],
    option1: initialQuestion?.option1 || "",
    option2: initialQuestion?.option2 || "",
    option3: initialQuestion?.option3 || "",
    option4: initialQuestion?.option4 || "",
    option5: initialQuestion?.option5 || "",
    answer: initialQuestion?.answer || "",
    explanation: initialQuestion?.explanation || "",
    subject: initialQuestion?.subject || "",
    paper: initialQuestion?.paper || "",
    chapter: initialQuestion?.chapter || "",
    highlight: initialQuestion?.highlight || "",
    question_image: initialQuestion?.question_image || undefined,
    explanation_image: initialQuestion?.explanation_image || undefined,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qImgRef = useRef<HTMLInputElement>(null);
  const eImgRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const optionNames: (keyof Question)[] = [
      "option1",
      "option2",
      "option3",
      "option4",
      "option5",
    ];
    setFormData((prev) => ({ ...prev, [optionNames[index]]: value }));
  };

  const addOption = () => {
    const optionNames: (keyof Question)[] = [
      "option1",
      "option2",
      "option3",
      "option4",
      "option5",
    ];
    for (let i = 0; i < optionNames.length; i++) {
      if (!formData[optionNames[i]]) {
        setFormData((prev) => ({ ...prev, [optionNames[i]]: "" }));
        break;
      }
    }
  };

  const removeLastOption = () => {
    const optionNames: (keyof Question)[] = [
      "option5",
      "option4",
      "option3",
      "option2",
      "option1",
    ];
    for (let i = 0; i < optionNames.length; i++) {
      const optionName = optionNames[i];
      if (formData[optionName] && formData[optionName] !== "") {
        setFormData((prev) => ({ ...prev, [optionName]: "" }));
        break;
      }
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "question" | "explanation",
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Limit check (e.g. 500KB for base64)
      if (file.size > 500 * 1024) {
        alert("Image size should be less than 500KB");
        return;
      }

      try {
        const base64 = await convertToBase64(file);
        setFormData((prev) => ({
          ...prev,
          [type === "question" ? "question_image" : "explanation_image"]:
            base64,
        }));
      } catch {
        alert("Failed to process image");
      }
    }
  };

  const removeImage = (type: "question" | "explanation") => {
    setFormData((prev) => ({
      ...prev,
      [type === "question" ? "question_image" : "explanation_image"]: undefined,
    }));
    if (type === "question" && qImgRef.current) qImgRef.current.value = "";
    if (type === "explanation" && eImgRef.current) eImgRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      if (initialQuestion?.id) {
        result = await apiRequest("update-question", "POST", {
          ...formData,
          id: initialQuestion.id,
        });
      } else {
        result = await apiRequest("create-question", "POST", formData);
      }

      if (!result.success) {
        throw new Error(result.message || "Failed to save question");
      }

      // Use the returned data if available, otherwise fallback to formData
      const savedQuestion = (result.data as Question) || formData;
      onSave(savedQuestion);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-muted-foreground/10 shadow-lg">
      <CardHeader className="bg-muted/5 border-b">
        <CardTitle className="text-xl">
          {initialQuestion ? "প্রশ্ন এডিট করুন" : "নতুন প্রশ্ন যোগ করুন"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <AlertBox type="error" title={error} />}

          <div className="space-y-2">
            <Label htmlFor="question_text" className="font-bold">
              প্রশ্ন (Question) *
            </Label>
            <Textarea
              id="question_text"
              name="question_text"
              value={formData.question_text || ""}
              onChange={handleChange}
              required
              className="min-h-[100px] rounded-xl"
              placeholder="Enter the question text (LaTeX allowed)..."
            />
          </div>

          <div className="space-y-3">
            <Label className="font-bold">অপশনসমূহ (Options)</Label>
            <div className="grid grid-cols-1 gap-3">
              {[0, 1, 2, 3, 4].map((index) => {
                const optionNames: (keyof Question)[] = [
                  "option1",
                  "option2",
                  "option3",
                  "option4",
                  "option5",
                ];
                const optionName = optionNames[index];

                if (!formData[optionName] && index > 3) return null;

                return (
                  <div key={index} className="flex items-center gap-2 group">
                    <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <Input
                      name={optionName}
                      value={(formData[optionName] as string) || ""}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      className="rounded-xl"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="rounded-lg h-8 flex-1 sm:flex-none"
              >
                <Plus className="w-3 h-3 mr-1" /> অপশন যোগ করুন
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeLastOption}
                className="rounded-lg h-8 text-destructive flex-1 sm:flex-none"
                disabled={
                  !formData.option5 ||
                  (!formData.option4 && formData.option5 === "")
                }
              >
                <X className="w-3 h-3 mr-1" /> শেষটি বাদ দিন
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="answer" className="font-bold text-success">
                সঠিক উত্তর *
              </Label>
              <Input
                id="answer"
                name="answer"
                value={formData.answer}
                onChange={handleChange}
                required
                className="rounded-xl border-success/30 focus:ring-success/20"
                placeholder="e.g., A, B or 1, 2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="explanation" className="font-bold">
                ব্যাখ্যা (Explanation)
              </Label>
              <Input
                id="explanation"
                name="explanation"
                value={formData.explanation || ""}
                onChange={handleChange}
                className="rounded-xl"
                placeholder="Provide explanation..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-t pt-6">
            <div className="space-y-2">
              <Label htmlFor="subject" className="font-bold text-xs">
                Subject
              </Label>
              <Input
                id="subject"
                name="subject"
                value={formData.subject || ""}
                onChange={handleChange}
                className="rounded-xl h-9 text-sm"
                placeholder="e.g., Physics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paper" className="font-bold text-xs">
                Paper
              </Label>
              <Input
                id="paper"
                name="paper"
                value={formData.paper || ""}
                onChange={handleChange}
                className="rounded-xl h-9 text-sm"
                placeholder="e.g., 1st"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapter" className="font-bold text-xs">
                Chapter
              </Label>
              <Input
                id="chapter"
                name="chapter"
                value={formData.chapter || ""}
                onChange={handleChange}
                className="rounded-xl h-9 text-sm"
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlight" className="font-bold text-xs">
                Highlight
              </Label>
              <Input
                id="highlight"
                name="highlight"
                value={formData.highlight || ""}
                onChange={handleChange}
                className="rounded-xl h-9 text-sm"
                placeholder="e.g., Admission"
              />
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
            <div className="space-y-3">
              <Label className="font-bold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> প্রশ্নের ছবি (ঐচ্ছিক)
              </Label>
              <div className="space-y-3">
                <Input
                  ref={qImgRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "question")}
                  className="cursor-pointer"
                />
                {formData.question_image && (
                  <div className="space-y-2">
                    <div className="relative w-24 h-24">
                      <Image
                        src={formData.question_image}
                        alt="Question Preview"
                        fill
                        className="object-cover rounded-lg border"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage("question")}
                    >
                      ছবি সরান
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-bold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> ব্যাখ্যার ছবি (ঐচ্ছিক)
              </Label>
              <div className="space-y-3">
                <Input
                  ref={eImgRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "explanation")}
                  className="cursor-pointer"
                />
                {formData.explanation_image && (
                  <div className="space-y-2">
                    <div className="relative w-24 h-24">
                      <Image
                        src={formData.explanation_image}
                        alt="Explanation Preview"
                        fill
                        className="object-cover rounded-lg border"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage("explanation")}
                    >
                      ছবি সরান
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl h-11 order-1 sm:order-2"
            >
              {loading ? (
                <CustomLoader minimal />
              ) : initialQuestion ? (
                "আপডেট করুন"
              ) : (
                "সেভ করুন"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="rounded-xl h-11 flex-1 order-2 sm:order-1"
            >
              বাতিল
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
