<?php
/**
 * Clean up HTML tags from CSV data
 * Specifically removes color="black" from font tags as requested
 */
function cleanCsvHtml($text) {
    if (empty($text)) return $text;
    
    // Remove ANY color="..." attribute from <font> tags.
    // Handles single, double, or no quotes around the color value.
    $text = preg_replace_callback('/(<font\b[^>]*?)\bcolor\s*=\s*["\']?[^"\'>]*?["\']?([^>]*?>)/i', function($matches) {
        return $matches[1] . $matches[2];
    }, $text);
    
    return $text;
}

/**
 * Detect if answers are 0-indexed (start from 0)
 * Checks if answer values contain 0 but no values >= option_count
 */
function detectZeroIndexedAnswers($questions) {
    if (empty($questions)) return false;
    
    $has_zero = false;
    $max_option_value = 0;
    
    foreach ($questions as $q) {
        $answer = trim($q['answer']);
        
        // Check if answer is numeric
        if (is_numeric($answer)) {
            $answer_val = (int)$answer;
            
            if ($answer_val === 0) {
                $has_zero = true;
            }
            
            $max_option_value = max($max_option_value, $answer_val);
        }
    }
    
    // If we found zeros and max value is 5 or less (0,1,2,3,4,5 format for up to 6 options)
    // then it's likely 0-indexed. Increased from 3 to 5 to support 5-option questions (0-4).
    return $has_zero && $max_option_value <= 5;
}

/**
 * Convert 0-indexed answers to 1-indexed
 * 0 -> 1, 1 -> 2, etc.
 */
function convertAnswersFromZeroToOne(&$questions) {
    foreach ($questions as &$q) {
        $answer = trim($q['answer']);
        
        if (is_numeric($answer)) {
            $answer_val = (int)$answer;
            $q['answer'] = (string)($answer_val + 1);
        }
    }
}

function parseCSV($filepath, $forceConvert = false) {
    // Set locale to ensure fgetcsv handles UTF-8 correctly
    setlocale(LC_ALL, 'en_US.UTF-8');
    
    $questions = [];
    
    // Detect encoding and convert to UTF-8 if needed
    $content = file_get_contents($filepath);
    
    // Try to detect encoding more robustly
    $encoding = mb_detect_encoding($content, ['UTF-8', 'Windows-1252', 'ISO-8859-1'], true);
    if ($encoding && $encoding !== 'UTF-8') {
        $content = mb_convert_encoding($content, 'UTF-8', $encoding);
    }
    
    // Strip UTF-8 BOM if present
    if (substr($content, 0, 3) === "\xEF\xBB\xBF") {
        $content = substr($content, 3);
    }
    
    // Save back to temp file to read with fgetcsv
    file_put_contents($filepath, $content);

    if (($handle = fopen($filepath, "r")) !== FALSE) {
        $header = fgetcsv($handle, 0, ",");
        
        if ($header === FALSE) {
            fclose($handle);
            return [];
        }

        // Normalize headers: lowercase, trim, remove BOM artifacts
        $header = array_map(function($h) {
            return strtolower(trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $h)));
        }, $header);

        // Expected columns mapping
        $expected_cols = [
            'questions' => 'question_text',
            'question' => 'question_text', // alias
            'option1' => 'option1',
            'option2' => 'option2',
            'option3' => 'option3',
            'option4' => 'option4',
            'option5' => 'option5',
            'answer' => 'answer',
            'explanation' => 'explanation',
            'type' => 'type',
            'section' => 'subject',
            'subject' => 'subject',
            'paper' => 'paper',
            'chapter' => 'chapter',
            'highlight' => 'highlight'
        ];

        $col_map = [];
        foreach ($header as $index => $col_name) {
            foreach ($expected_cols as $csv_key => $db_key) {
                if (strpos($col_name, $csv_key) !== false) {
                    $col_map[$db_key] = $index;
                    break;
                }
            }
        }

        while (($row = fgetcsv($handle, 0, ",")) !== FALSE) {
            // Skip empty rows
            if (empty(array_filter($row))) continue;

            $q = [
                'question_text' => '',
                'option1' => '',
                'option2' => '',
                'option3' => '',
                'option4' => '',
                'option5' => '',
                'answer' => '',
                'explanation' => '',
                'type' => 0,
                'subject' => '',
                'paper' => '',
                'chapter' => '',
                'highlight' => ''
            ];

            foreach ($col_map as $db_key => $index) {
                if (isset($row[$index])) {
                    // Clean up the data but KEEP HTML
                    $val = trim($row[$index]);
                    
                    // Apply HTML cleanup (remove color="black")
                    $val = cleanCsvHtml($val);
                    
                    $q[$db_key] = $val;
                }
            }
            
            // Basic validation: must have question text
            if (!empty($q['question_text'])) {
                $questions[] = $q;
            }
        }
        fclose($handle);
    }
    
    // Auto-detect or force convert 0-indexed answers to 1-indexed
    $shouldConvert = $forceConvert || detectZeroIndexedAnswers($questions);
    if ($shouldConvert) {
        convertAnswersFromZeroToOne($questions);
    }
    
    return $questions;
}
?>
