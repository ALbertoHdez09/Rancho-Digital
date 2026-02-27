// src/services/supabase.ts
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://ompeukbzjybtdbaarsmt.supabase.co";
const supabaseAnonKey = "sb_publishable_rzcG2Jipml2flSFJSruViw_MTKr1ZbI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
