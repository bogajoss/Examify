"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type {
  User,
  ServerActionResponse,
  Batch,
  UserFormResult,
} from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

// Default batch ID that all users should be enrolled in
// const DEFAULT_BATCH_ID = "48a42c85-aa53-4749-a4b8-851fe2003464";

// Updated schema to handle both create and edit
const formSchema = z.object({
  name: z.string().min(2, {
    message: "নাম কমপক্ষে ২টি অক্ষরের হতে হবে।",
  }),
  roll: z.string().min(1, {
    message: "রোল নম্বর আবশ্যক।",
  }),
  pass: z.string().optional(),
  enrolled_batches: z.array(z.string()).optional(),
  passwordMode: z.enum(["auto", "manual"]).optional(),
});

type UserFormValues = z.infer<typeof formSchema>;

type UserFormProps = {
  defaultValues: Partial<User> | null;
  action: (formData: FormData) => Promise<ServerActionResponse>;
  onSuccess: (data?: User | UserFormResult | null) => void;
  isCreateMode?: boolean;
  batches?: Batch[];
};

export function UserForm({
  defaultValues,
  action,
  onSuccess,
  isCreateMode = false,
  batches = [],
}: UserFormProps) {
  const [passwordMode, setPasswordMode] = useState<"auto" | "manual">("auto");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<string[]>(
    isCreateMode ? [] : (defaultValues?.enrolled_batches as string[]) || [],
  );

  const form = useForm<UserFormValues>({
    resolver: zodResolver(
      isCreateMode
        ? formSchema.pick({
            name: true,
            roll: true,
            enrolled_batches: true,
            passwordMode: true,
          })
        : formSchema.extend({
            pass: z
              .string()
              .optional()
              .transform((val) => val?.trim() || "")
              .refine((val) => val === "" || val.length >= 4, {
                message: "পাসওয়ার্ড কমপক্ষে ৪টি অক্ষরের হতে হবে।",
              }),
          }),
    ),
    defaultValues: {
      name: defaultValues?.name || "",
      roll: defaultValues?.roll || "",
      pass: isCreateMode ? "" : defaultValues?.pass || "",
      enrolled_batches: selectedBatches,
      passwordMode: "auto",
    },
  });

  const { formState, handleSubmit } = form;

  const handleBatchToggle = (batchId: string, checked: boolean) => {
    let newBatches: string[];
    if (checked) {
      newBatches = [...selectedBatches, batchId];
    } else {
      newBatches = selectedBatches.filter((id) => id !== batchId);
    }

    setSelectedBatches(newBatches);
    form.setValue("enrolled_batches", newBatches);
  };

  const handleFormSubmit = async (values: UserFormValues) => {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("roll", values.roll || "");

    if (isCreateMode) {
      // Always include selected batches
      formData.append("enrolled_batches", JSON.stringify(selectedBatches));
      // Pass password mode to action
      formData.append("passwordMode", passwordMode);
      if (passwordMode === "manual") {
        formData.append("pass", values.pass || "");
      }
    } else {
      // Only append password if it's provided (user wants to change it)
      if (values.pass && values.pass.trim() !== "") {
        formData.append("pass", values.pass);
      } else {
        formData.append("pass", "");
      }
      if (defaultValues?.uid) {
        formData.append("uid", defaultValues.uid);
      }
    }

    const result = await action(formData);

    if (result?.success) {
      onSuccess(result.data as User | UserFormResult | null);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>নাম</FormLabel>
              <FormControl>
                <Input
                  placeholder="ব্যবহারকারীর নাম"
                  {...field}
                  disabled={formState.isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isCreateMode && (
          <FormField
            control={form.control}
            name="roll"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  রোল নম্বর / ফোন নম্বর (অফিসিয়ালি রোল না পেলে তোমার ফোন নম্বর
                  দাও)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="ব্যবহারকারীর রোল বা ফোন নম্বর"
                    {...field}
                    disabled={formState.isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {isCreateMode && (
          <FormItem>
            <FormLabel>ব্যাচ</FormLabel>
            <div className="space-y-3 border rounded-lg p-3 bg-muted/50">
              {batches.map((batch) => {
                const isChecked = selectedBatches.includes(batch.id);

                return (
                  <div key={batch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`batch-${batch.id}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleBatchToggle(batch.id, checked as boolean)
                      }
                      disabled={formState.isSubmitting}
                    />
                    <label
                      htmlFor={`batch-${batch.id}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{batch.name}</span>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
        {isCreateMode && (
          <FormItem>
            <FormLabel>পাসওয়ার্ড</FormLabel>
            <FormControl>
              <RadioGroup
                value={passwordMode}
                onValueChange={(value) => {
                  setPasswordMode(value as "auto" | "manual");
                  form.setValue("passwordMode", value as "auto" | "manual");
                }}
                disabled={formState.isSubmitting}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto" id="mode-auto" />
                  <label htmlFor="mode-auto" className="cursor-pointer">
                    অটো
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="mode-manual" />
                  <label htmlFor="mode-manual" className="cursor-pointer">
                    ম্যানুয়াল
                  </label>
                </div>
              </RadioGroup>
            </FormControl>
          </FormItem>
        )}
        {isCreateMode && passwordMode === "manual" && (
          <FormField
            control={form.control}
            name="pass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>পাসওয়ার্ড</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="create-password-field"
                      type={showPassword ? "text" : "password"}
                      placeholder="ব্যবহারকারীর পাসওয়ার্ড"
                      {...field}
                      disabled={formState.isSubmitting}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "লুকান" : "দেখান"}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {!isCreateMode && (
          <>
            <FormField
              control={form.control}
              name="roll"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    রোল নম্বর / ফোন নম্বর (অফিসিয়ালি রোল না পেলে তোমার ফোন নম্বর
                    দাও)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="রোল নম্বর"
                      {...field}
                      disabled={formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>পাসওয়ার্ড</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        id="password-field"
                        type={showPassword ? "text" : "password"}
                        placeholder="নতুন পাসওয়ার্ড (খালি রাখলে পুরনো পাসওয়ার্ড অপরিবর্তিত থাকবে)"
                        {...field}
                        disabled={formState.isSubmitting}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "লুকান" : "দেখান"}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "সংরক্ষণ করা হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </form>
    </Form>
  );
}
