import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Loader2, ChevronLeft, Check, AlertCircle, Upload } from 'lucide-react';
import { Logo } from './Logo';
import { supabase } from '../services/supabaseClient';

export const AuthScreen = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [displayName, setDisplayName] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(60);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for OTP
  useEffect(() => {
    let interval: any;
    if (step === 3 && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
      });
      
      if (error) throw error;
      
      setStep(3);
      setTimer(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpString,
        type: 'email'
      });
      
      if (error) throw error;
      
      // Check if user already has a profile set up
      const { data: profile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', data.user?.id)
        .single();

      if (!profile?.full_name) {
        setStep(4);
      } else {
        onAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Update the users table
      const { error } = await supabase
        .from('users')
        .upsert({ 
          id: user.id,
          email: user.email,
          full_name: displayName,
          avatar: profilePic
        });
      
      if (error) throw error;
      
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <main className="flex h-screen w-full bg-white dark:bg-nexus-dark overflow-hidden">
      {/* LEFT SIDE: IMAGE (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-nexus-midnight items-center justify-center overflow-hidden">
         <div className="absolute inset-0">
            <img 
              src="/background.svg" 
              alt="Daddy Background" 
              className="w-full h-full object-cover"
            />
         </div>
         <div className="relative z-10 p-16 max-w-2xl text-white">
            <div className="mb-8 flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                 <Logo className="w-12 h-12" />
              </div>
              <span className="text-2xl font-bold tracking-widest uppercase opacity-80">Daddy</span>
            </div>
            <h1 className="text-5xl xl:text-6xl font-black mb-8 tracking-tight leading-tight">
              Connect with your world <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-nexus-mint to-blue-400">in real time.</span>
            </h1>
         </div>
      </div>

      {/* RIGHT SIDE: FORM */}
      <section className="w-full lg:w-1/2 flex flex-col relative bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-nexus-dark dark:via-gray-900 dark:to-black">
         {step > 1 && step < 4 && (
           <div className="absolute top-6 left-6 z-20">
              <button 
                onClick={() => setStep((prev) => (prev - 1) as any)} 
                className="p-2 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-md hover:bg-white/80 dark:hover:bg-black/40 transition-colors group shadow-sm border border-white/20"
              >
                 <ChevronLeft size={28} className="text-nexus-midnight dark:text-white group-hover:-translate-x-1 transition-transform" />
              </button>
           </div>
         )}

         <div className="flex-1 overflow-y-auto no-scrollbar flex items-center justify-center relative z-10">
            <div className="w-full max-w-md mx-auto p-8 animate-fade-in-up">
               
               {error && (
                 <div className="mb-6 p-4 bg-nexus-coral/10 border-l-4 border-nexus-coral text-nexus-coral text-sm rounded-r-xl font-medium flex items-start gap-3">
                    <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                 </div>
               )}

               {/* SCREEN 1: Welcome */}
               {step === 1 && (
                 <div className="text-center space-y-8">
                   <div className="w-24 h-24 mx-auto bg-nexus-mint/10 rounded-full flex items-center justify-center mb-6">
                     <Logo className="w-12 h-12 text-nexus-mint" />
                   </div>
                   <h2 className="text-3xl font-bold text-nexus-midnight dark:text-white">Welcome to Daddy</h2>
                   <p className="text-gray-500 dark:text-gray-400 text-lg">
                     Read our Privacy Policy. Tap "Agree and Continue" to accept the Terms of Service.
                   </p>
                   <button 
                     onClick={() => setStep(2)}
                     className="w-full py-4 bg-nexus-midnight dark:bg-nexus-mint text-white dark:text-nexus-midnight font-bold text-lg rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     Agree and Continue
                   </button>
                 </div>
               )}

               {/* SCREEN 2: Email Input */}
               {step === 2 && (
                 <form onSubmit={handleRequestOtp} className="space-y-8">
                   <div className="text-center mb-8">
                     <h2 className="text-3xl font-bold text-nexus-midnight dark:text-white mb-3">Log in or sign up</h2>
                     <p className="text-gray-500 dark:text-gray-400">
                       Enter your email to continue. Daddy will send a secure 6-digit code to verify your account.
                     </p>
                   </div>

                   <div className="space-y-4">
                     <input 
                       type="email" 
                       required
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="w-full bg-gray-100 dark:bg-gray-800 text-nexus-midnight dark:text-white p-4 rounded-xl outline-none focus:ring-2 focus:ring-nexus-mint transition-all font-bold border-2 border-transparent text-lg"
                       placeholder="you@example.com"
                     />
                   </div>

                   <button 
                     type="submit" 
                     disabled={loading || !email.includes('@')}
                     className={`w-full py-4 text-white font-bold text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all 
                       ${loading || !email.includes('@') ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' : 'bg-nexus-midnight dark:bg-nexus-mint dark:text-nexus-midnight hover:scale-[1.02] active:scale-95'}`}
                   >
                     {loading ? <Loader2 className="animate-spin" /> : 'Next'}
                   </button>
                 </form>
               )}

               {/* SCREEN 3: OTP Verification */}
               {step === 3 && (
                 <form onSubmit={handleVerifyOtp} className="space-y-8">
                   <div className="text-center mb-8">
                     <h2 className="text-3xl font-bold text-nexus-midnight dark:text-white mb-3">Verify your email</h2>
                     <p className="text-gray-500 dark:text-gray-400">
                       Enter the 6-digit code we sent to <br/>
                       <span className="font-bold text-nexus-midnight dark:text-white">{email}</span>
                     </p>
                   </div>

                   <div className="flex justify-between gap-2">
                     {otp.map((digit, index) => (
                       <input
                         key={index}
                         ref={(el) => (otpRefs.current[index] = el)}
                         type="text"
                         maxLength={1}
                         value={digit}
                         autoComplete="one-time-code"
                         onChange={(e) => handleOtpChange(index, e.target.value)}
                         onKeyDown={(e) => handleOtpKeyDown(index, e)}
                         className="w-12 h-14 text-center text-2xl font-bold bg-gray-100 dark:bg-gray-800 text-nexus-midnight dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-nexus-mint border-2 border-transparent"
                       />
                     ))}
                   </div>

                   <div className="text-center text-sm font-medium text-gray-500">
                     {timer > 0 ? (
                       <p>Resend code in 0:{timer.toString().padStart(2, '0')}</p>
                     ) : (
                       <button type="button" onClick={() => handleRequestOtp()} className="text-nexus-mint hover:underline">
                         Resend code
                       </button>
                     )}
                   </div>

                   <button 
                     type="submit" 
                     disabled={loading || otp.join('').length !== 6}
                     className={`w-full py-4 text-white font-bold text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all 
                       ${loading || otp.join('').length !== 6 ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' : 'bg-nexus-midnight dark:bg-nexus-mint dark:text-nexus-midnight hover:scale-[1.02] active:scale-95'}`}
                   >
                     {loading ? <Loader2 className="animate-spin" /> : 'Verify'}
                   </button>
                 </form>
               )}

               {/* SCREEN 4: Profile Initialization */}
               {step === 4 && (
                 <form onSubmit={handleProfileSetup} className="space-y-8">
                   <div className="text-center mb-8">
                     <h2 className="text-3xl font-bold text-nexus-midnight dark:text-white mb-3">Profile Info</h2>
                     <p className="text-gray-500 dark:text-gray-400">
                       Please provide your name and an optional profile photo.
                     </p>
                   </div>

                   <div className="flex flex-col items-center gap-6">
                     <div className="relative">
                       <div className="w-28 h-28 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-nexus-dark shadow-lg">
                         {profilePic ? (
                           <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                         ) : (
                           <Upload size={32} className="text-gray-400" />
                         )}
                       </div>
                       <input 
                         type="file" 
                         accept="image/*"
                         onChange={handleImageUpload}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       />
                     </div>

                     <input 
                       type="text" 
                       required
                       value={displayName}
                       onChange={(e) => setDisplayName(e.target.value)}
                       className="w-full bg-gray-100 dark:bg-gray-800 text-nexus-midnight dark:text-white p-4 rounded-xl outline-none focus:ring-2 focus:ring-nexus-mint transition-all font-bold border-2 border-transparent text-lg text-center"
                       placeholder="Type your name here"
                     />
                   </div>

                   <button 
                     type="submit" 
                     disabled={loading || !displayName.trim()}
                     className={`w-full py-4 text-white font-bold text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all 
                       ${loading || !displayName.trim() ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' : 'bg-nexus-midnight dark:bg-nexus-mint dark:text-nexus-midnight hover:scale-[1.02] active:scale-95'}`}
                   >
                     {loading ? <Loader2 className="animate-spin" /> : 'Complete Setup'}
                   </button>
                 </form>
               )}

            </div>
         </div>
      </section>
    </main>
  );
};