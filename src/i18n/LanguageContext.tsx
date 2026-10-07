import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

export type Language = 'en' | 'ne';

const LANGUAGE_KEY = 'shram-bazar-language';

const translations: Record<string, string> = {
  // Shared navigation and actions
  Shrama: 'श्रम',
  'Discover Jobs': 'काम खोज्नुहोस्',
  'My Applications': 'मेरा आवेदन',
  'Saved Jobs': 'सेभ गरेका काम',
  'My Profile': 'मेरो प्रोफाइल',
  'Dashboard': 'ड्यासबोर्ड',
  'Post a Job': 'काम पोस्ट गर्नुहोस्',
  'My Jobs': 'मेरा काम',
  'Organisation': 'संस्था',
  'Worker': 'कामदार',
  'Provider': 'रोजगारदाता',
  'Sign out': 'साइन आउट',
  'Sign in': 'साइन इन',
  'Get Started': 'सुरु गर्नुहोस्',
  'Back': 'पछाडि',
  'Cancel': 'रद्द गर्नुहोस्',
  'Save': 'सेभ गर्नुहोस्',
  'Edit': 'सम्पादन',
  'Delete': 'मेटाउनुहोस्',
  'Confirm': 'पक्का गर्नुहोस्',
  'Switch to Nepali': 'नेपालीमा बदल्नुहोस्',
  'Switch to English': 'अङ्ग्रेजीमा बदल्नुहोस्',
  'Please sign in before reporting a job.': 'काम रिपोर्ट गर्न पहिले साइन इन गर्नुहोस्।',
  'This job is no longer available.': 'यो काम अब उपलब्ध छैन।',
  'You have already reported this job.': 'तपाईंले यो काम पहिले नै रिपोर्ट गरिसक्नुभएको छ।',
  'This will permanently delete the job posting and all associated applications. This cannot be undone.': 'यसले काम पोस्ट र सम्बन्धित सबै आवेदन स्थायी रूपमा मेटाउँछ। यसलाई फिर्ता गर्न मिल्दैन।',
  'Close': 'बन्द गर्नुहोस्',
  'View': 'हेर्नुहोस्',
  'All': 'सबै',
  'Active': 'सक्रिय',
  'Closed': 'बन्द',
  'Filled': 'भरिएको',
  'Draft': 'ड्राफ्ट',
  'Verified': 'प्रमाणित',
  'Pending': 'विचाराधीन',
  'Accepted': 'स्वीकृत',
  'Shortlisted': 'छनोट सूचीमा',
  'Rejected': 'अस्वीकृत',
  'Not Selected': 'छनोट भएन',

  // Landing hero and marketplace
  "Nepal's Flexible Work Platform": 'नेपालको लचिलो कामको प्लेटफर्म',
  "Nepal's Bazaar": 'नेपालको बजार',
  'for Flexible Work': 'सीपलाई अवसरसँग जोडौँ',
  'Shrama connects skilled workers with businesses across Nepal.': '',
  'Find Flexible Work': 'लचिलो काम खोज्नुहोस्',
  'Hire Workers': 'कामदार खोज्नुहोस्',
  'Already have an account?': 'पहिले नै खाता छ?',
  'Active jobs': 'सक्रिय काम',
  'Worker profiles': 'कामदार प्रोफाइल',
  'Verified providers': 'प्रमाणित रोजगारदाता',
  'Districts with jobs': 'काम भएका जिल्ला',
  'Simple for both sides': 'दुवै पक्षका लागि सजिलो',
  'How Shrama works': 'श्रम कसरी चल्छ',
  'Clear steps for finding work and hiring dependable people.': 'काम खोज्न र भरपर्दो कामदार राख्न सजिला चरणहरू।',
  'For workers': 'कामदारका लागि',
  'For providers': 'रोजगारदाताका लागि',
  'Build your profile': 'आफ्नो प्रोफाइल बनाउनुहोस्',
  'Add your location, skills, experience and availability.': 'ठेगाना, सीप, अनुभव र उपलब्ध समय थप्नुहोस्।',
  'Find relevant work': 'मिल्ने काम खोज्नुहोस्',
  'Search real provider jobs by district, skill, category and NPR payment.': 'जिल्ला, सीप, श्रेणी र NPR भुक्तानीअनुसार वास्तविक काम खोज्नुहोस्।',
  'Apply and track': 'आवेदन दिनुहोस् र अवस्था हेर्नुहोस्',
  'Send one application and follow every status update from your dashboard.': 'एकपटक आवेदन दिनुहोस् र ड्यासबोर्डबाट अवस्था हेर्नुहोस्।',
  'Register your organisation': 'आफ्नो संस्था दर्ता गर्नुहोस्',
  'Add your contact details, district and PAN information.': 'सम्पर्क विवरण, जिल्ला र PAN जानकारी थप्नुहोस्।',
  'Post clear work': 'स्पष्ट काम पोस्ट गर्नुहोस्',
  'State the requirements, location, duration and NPR payment.': 'आवश्यकता, स्थान, अवधि र NPR भुक्तानी खुलाउनुहोस्।',
  'Review and hire': 'आवेदन हेरेर कामदार राख्नुहोस्',
  'Compare profiles, shortlist applicants and record a hiring decision.': 'प्रोफाइल तुलना गर्नुहोस्, सूची बनाउनुहोस् र निर्णय गर्नुहोस्।',
  'Create a worker profile': 'कामदार प्रोफाइल बनाउनुहोस्',
  'Post a job': 'काम पोस्ट गर्नुहोस्',
  'Open opportunities': 'खुला अवसरहरू',
  'Find work across Nepal': 'नेपालभर काम खोज्नुहोस्',
  'Search real jobs created by registered providers. Payment is always shown in NPR.': 'दर्ता भएका रोजगारदाताले राखेका वास्तविक काम खोज्नुहोस्। भुक्तानी सधैं NPR मा देखाइन्छ।',
  'Search jobs or providers': 'काम वा रोजगारदाता खोज्नुहोस्',
  'All locations': 'सबै स्थान',
  'All categories': 'सबै श्रेणी',
  'All skills': 'सबै सीप',
  'Professional': 'व्यावसायिक',
  'Skill based': 'सीपमा आधारित',
  'Beginner friendly': 'नयाँका लागि उपयुक्त',
  'No matching jobs yet': 'मिल्ने काम अझै छैन',
  'Jobs appear here only after a provider posts them.': 'रोजगारदाताले पोस्ट गरेपछि मात्र काम यहाँ देखिन्छ।',
  'Post the first job →': 'पहिलो काम पोस्ट गर्नुहोस् →',
  'Browse the marketplace': 'बजार हेर्नुहोस्',
  'Popular skills and categories': 'लोकप्रिय सीप र श्रेणी',
  'Start with the kind of work you need, then narrow results by skill and location.': 'चाहिएको काम छान्नुहोस्, त्यसपछि सीप र स्थानअनुसार नतिजा मिलाउनुहोस्।',
  'Professional work': 'व्यावसायिक काम',
  'Skilled trades': 'सीपमूलक काम',
  'Entry-level work': 'सुरुवाती काम',
  'Healthcare, education, accounting, technology and other qualified roles.': 'स्वास्थ्य, शिक्षा, लेखा, प्रविधि र अन्य योग्यता चाहिने काम।',
  'Electrical, plumbing, carpentry, driving, hospitality and practical trades.': 'बिजुली, प्लम्बिङ, सिकर्मी, ड्राइभिङ, होटल र अन्य व्यवहारिक सीपका काम।',
  'Event support, loading, cleaning and flexible work open to new workers.': 'कार्यक्रम सहयोग, सामान बोक्ने, सरसफाइ र नयाँ कामदारका लागि खुला काम।',
  'Worker directory': 'कामदार सूची',
  'Find workers ready for the job': 'कामका लागि तयार कामदार खोज्नुहोस्',
  'Review real worker profiles, experience, availability and completed-work ratings.': 'कामदारको प्रोफाइल, अनुभव, उपलब्धता र कामको मूल्याङ्कन हेर्नुहोस्।',
  'Worker profiles will appear after workers register.': 'कामदार दर्ता भएपछि प्रोफाइल यहाँ देखिन्छ।',
  'Experience': 'अनुभव',
  'Rating': 'मूल्याङ्कन',
  'Availability': 'उपलब्धता',
  'New': 'नयाँ',
  'Organisations on Shrama': 'श्रम संस्थाहरू',
  'Trusted providers': 'भरपर्दा रोजगारदाता',
  'Verification is based on stored organisation and PAN status, never a decorative badge.': 'प्रमाणीकरण संस्थाको विवरण र PAN अवस्थाका आधारमा हुन्छ।',
  'Registered organisations will appear here.': 'दर्ता भएका संस्था यहाँ देखिन्छन्।',
  'No rating yet': 'अझै मूल्याङ्कन छैन',
  'Built for practical work': 'व्यवहारिक कामका लागि',
  'Why Shrama': 'किन श्रम',
  'A focused Nepal marketplace with the information workers and providers need to make clear decisions.': 'कामदार र रोजगारदातालाई सही निर्णय गर्न चाहिने जानकारी भएको नेपालको काम बजार।',
  'Verified Providers': 'प्रमाणित रोजगारदाता',
  'Transparent payment': 'स्पष्ट भुक्तानी',
  'Flexible work': 'लचिलो काम',
  'Trusted profiles': 'भरपर्दा प्रोफाइल',
  'Worker reputation': 'कामदारको प्रतिष्ठा',
  'Ratings built from completed work': 'पूरा भएको कामबाट बनेको मूल्याङ्कन',
  'Providers can leave a simple rating and review after accepting a worker.': 'कामदार स्वीकृत गरेपछि रोजगारदाताले सरल मूल्याङ्कन र समीक्षा दिन सक्छन्।',
  'Reviews will appear after completed work is rated.': 'पूरा भएको कामको मूल्याङ्कनपछि समीक्षा यहाँ देखिन्छ।',
  'Marketplace trust': 'बजारको भरोसा',
  'Simple reporting when something is wrong': 'समस्या हुँदा सजिलो रिपोर्ट',
  'Workers can report misleading information, unsafe work or suspicious payment requests directly from a job page.': 'कामदारले गलत जानकारी, असुरक्षित काम वा शंकास्पद भुक्तानी माग कामको पेजबाट रिपोर्ट गर्न सक्छन्।',
  'Ready to use Shrama?': 'श्रम प्रयोग गर्न तयार हुनुहुन्छ?',
  'Find work or build your workforce.': 'काम खोज्नुहोस् वा आफ्नो टोली बनाउनुहोस्।',
  'Create worker profile': 'कामदार प्रोफाइल बनाउनुहोस्',
  'Register as provider': 'रोजगारदाता दर्ता',
  'A practical marketplace connecting workers and organisations across Nepal.': 'नेपालभरका कामदार र संस्थालाई जोड्ने व्यवहारिक बजार।',
  'Marketplace': 'बजार',
  'Find work': 'काम खोज्नुहोस्',
  'Support': 'सहयोग',
  'Contact support': 'सहयोगमा सम्पर्क',
  'Report a concern': 'समस्या रिपोर्ट',
  'Account help': 'खाता सहयोग',
  'Legal & Nepal': 'कानुनी र नेपाल',
  'Terms of use': 'प्रयोगका सर्त',
  'Privacy': 'गोपनीयता',
  'Kathmandu, Nepal': 'काठमाडौं, नेपाल',

  // Authentication
  'Welcome back to Shrama': 'श्रममा फेरि स्वागत छ',
  'Find work that fits your life': 'आफ्नो समयअनुसार काम खोज्नुहोस्',
  'Hire the right people, fast': 'सही कामदार छिटो खोज्नुहोस्',
  "Sign in to your account to continue your journey on Nepal's flexible work platform.": 'नेपालको लचिलो काम प्लेटफर्म प्रयोग गर्न आफ्नो खातामा साइन इन गर्नुहोस्।',
  'Thousands of flexible jobs across Nepal. Match your skills and availability with the right opportunity.': 'नेपालभरका लचिला काममध्ये आफ्नो सीप र उपलब्धतासँग मिल्ने अवसर खोज्नुहोस्।',
  'Post jobs, review qualified applicants, and build your flexible workforce with confidence.': 'काम पोस्ट गर्नुहोस्, योग्य आवेदक हेर्नुहोस् र भरपर्दो टोली बनाउनुहोस्।',
  'Discover jobs matched to your skills': 'आफ्नो सीपसँग मिल्ने काम खोज्नुहोस्',
  'Track all your applications in one place': 'सबै आवेदन एकै ठाउँमा हेर्नुहोस्',
  'Build your work history and rating': 'कामको इतिहास र मूल्याङ्कन बनाउनुहोस्',
  'Verified provider badge builds trust': 'प्रमाणित रोजगारदाताले भरोसा बढाउँछ',
  'Review ranked applicant profiles': 'आवेदकका प्रोफाइल हेर्नुहोस्',
  'Manage all hirings from your dashboard': 'सबै भर्ती ड्यासबोर्डबाट व्यवस्थापन गर्नुहोस्',
  'Your profile and applications': 'तपाईंको प्रोफाइल र आवेदन',
  'New matching jobs in your district': 'तपाईंको जिल्लाका नयाँ मिल्ने काम',
  'Messages from providers': 'रोजगारदाताका सूचना',
  'Sign In': 'साइन इन',
  'Basic information': 'आधारभूत जानकारी',
  'Skills & district': 'सीप र जिल्ला',
  'Contact information': 'सम्पर्क जानकारी',
  'Business details': 'व्यवसाय विवरण',
  'Nepal workforce': 'नेपालको श्रम बजार',
  'Nepal workforce marketplace': 'नेपालको श्रम बजार',
  'Sign in to your account to continue your journey on Nepal’s flexible work platform.': 'नेपालको लचिलो काम प्लेटफर्म प्रयोग गर्न आफ्नो खातामा साइन इन गर्नुहोस्।',
  'Sign in to your account': 'आफ्नो खातामा साइन इन गर्नुहोस्',
  'Create Worker Account': 'कामदार खाता बनाउनुहोस्',
  'Create Provider Account': 'रोजगारदाता खाता बनाउनुहोस्',
  'Add Your Skills': 'आफ्ना सीप थप्नुहोस्',
  'Organisation Details': 'संस्थाको विवरण',
  'Back to home': 'गृहपृष्ठमा फर्कनुहोस्',
  'Register': 'दर्ता',
  'Email address': 'इमेल ठेगाना',
  'Password': 'पासवर्ड',
  'Full name': 'पूरा नाम',
  'Phone number': 'फोन नम्बर',
  'Phone': 'फोन',
  'Contact person name': 'सम्पर्क व्यक्तिको नाम',
  'Your district': 'तपाईंको जिल्ला',
  'Local address': 'स्थानीय ठेगाना',
  'Your skills': 'तपाईंका सीप',
  'Select all that apply': 'मिल्ने सबै छान्नुहोस्',
  'Organisation name': 'संस्थाको नाम',
  'PAN number': 'PAN नम्बर',
  'Required for verification': 'प्रमाणीकरणका लागि आवश्यक',
  'Industry': 'उद्योग',
  'District': 'जिल्ला',
  'Organisation address': 'संस्थाको ठेगाना',
  'Continue →': 'अर्को →',
  'Create Worker Account': 'कामदार खाता बनाउनुहोस्',
  'Register Organisation': 'संस्था दर्ता गर्नुहोस्',
  "Don't have an account?": 'खाता छैन?',
  'Already registered?': 'पहिले नै दर्ता हुनुहुन्छ?',
  'Register as Worker': 'कामदारका रूपमा दर्ता',
  'as Provider': 'रोजगारदाताका रूपमा',
  'Register as Provider': 'रोजगारदाताका रूपमा दर्ता',
  'as Worker': 'कामदारका रूपमा',
  'Email or password is incorrect.': 'इमेल वा पासवर्ड मिलेन।',
  'An account with this email already exists.': 'यो इमेलबाट खाता पहिले नै बनेको छ।',

  // Worker experience
  'Welcome back': 'फेरि स्वागत छ',
  'Applications': 'आवेदन',
  'Saved jobs': 'सेभ गरेका काम',
  'Jobs Done': 'पूरा काम',
  'Application Summary': 'आवेदनको सारांश',
  'Recommended for You': 'तपाईंका लागि मिल्ने काम',
  'See all jobs →': 'सबै काम हेर्नुहोस् →',
  'No new recommended jobs right now.': 'अहिले नयाँ मिल्ने काम छैन।',
  'Browse all jobs': 'सबै काम हेर्नुहोस्',
  'View saved jobs →': 'सेभ गरेका काम हेर्नुहोस् →',
  'Save useful jobs from discovery and they will appear here.': 'काम खोज्दा उपयोगी काम सेभ गर्नुहोस्, ती यहाँ देखिन्छन्।',
  'Profile Completeness': 'प्रोफाइल पूर्णता',
  'Basic info': 'आधारभूत जानकारी',
  'Skills added': 'सीप थपिएको',
  'Qualifications': 'योग्यता',
  'Work experience': 'कामको अनुभव',
  'Availability set': 'उपलब्धता राखिएको',
  'Complete Your Profile': 'प्रोफाइल पूरा गर्नुहोस्',
  'Recent Applications': 'हालका आवेदन',
  'No applications yet': 'अझै आवेदन छैन',
  'Your Skills': 'तपाईंका सीप',
  'Edit skills →': 'सीप सम्पादन →',
  'Update availability →': 'उपलब्धता अपडेट →',
  'Work History': 'कामको इतिहास',
  'Accepted and reviewed work will appear here.': 'स्वीकृत र समीक्षा भएका काम यहाँ देखिन्छन्।',
  'Discover Opportunities': 'कामका अवसर खोज्नुहोस्',
  'Search, filter, and find work that matches your skills and schedule.': 'आफ्नो सीप र समयअनुसार काम खोज्नुहोस् र फिल्टर गर्नुहोस्।',
  'Search by job title, skill, or provider…': 'काम, सीप वा रोजगारदाता खोज्नुहोस्…',
  'Filters': 'फिल्टर',
  'Clear all': 'सबै हटाउनुहोस्',
  'Location': 'स्थान',
  'Category': 'श्रेणी',
  'Work Type': 'कामको प्रकार',
  'Minimum Pay (NPR)': 'न्यूनतम भुक्तानी (NPR)',
  'Skill': 'सीप',
  'Date': 'मिति',
  'Sort by': 'क्रम मिलाउनुहोस्',
  'Best Match': 'सबैभन्दा मिल्ने',
  'Payment: High to Low': 'भुक्तानी: धेरैदेखि थोरै',
  'Payment: Low to High': 'भुक्तानी: थोरैदेखि धेरै',
  'Newest First': 'नयाँ पहिले',
  'Deadline Soon': 'म्याद चाँडो',
  'No jobs found': 'काम भेटिएन',
  'Try adjusting your search or filters.': 'खोज वा फिल्टर परिवर्तन गरेर हेर्नुहोस्।',
  'Job Description': 'कामको विवरण',
  'Requirements': 'आवश्यकता',
  'Skills Required': 'चाहिने सीप',
  'Qualification': 'योग्यता',
  'Why this job may fit': 'यो काम किन मिल्न सक्छ',
  'Your Application': 'तपाईंको आवेदन',
  'Add a short note to stand out. Your full profile will be shared with the provider.': 'छोटो नोट लेख्नुहोस्। तपाईंको पूरा प्रोफाइल रोजगारदातालाई देखाइनेछ।',
  'Submit Application →': 'आवेदन पठाउनुहोस् →',
  'Application Submitted!': 'आवेदन पठाइयो!',
  "You'll receive a notification once the provider reviews your profile.": 'रोजगारदाताले प्रोफाइल हेरेपछि सूचना आउँछ।',
  'View My Applications →': 'मेरा आवेदन हेर्नुहोस् →',
  'Time': 'समय',
  'Duration': 'अवधि',
  'Workers Needed': 'चाहिने कामदार',
  'Apply By': 'आवेदन म्याद',
  'Apply for this Job': 'यो कामका लागि आवेदन',
  'Position Filled': 'स्थान भरियो',
  'Application Submitted': 'आवेदन पठाइयो',
  'About the Provider': 'रोजगारदाताबारे',
  'Report this job': 'यो काम रिपोर्ट गर्नुहोस्',
  'Incorrect or misleading information': 'गलत वा भ्रामक जानकारी',
  'Unsafe or inappropriate work': 'असुरक्षित वा अनुपयुक्त काम',
  'Suspicious payment request': 'शंकास्पद भुक्तानी माग',
  'Other': 'अन्य',
  'Optional details': 'थप विवरण (ऐच्छिक)',
  'Submit report': 'रिपोर्ट पठाउनुहोस्',
  'Report submitted. Thank you.': 'रिपोर्ट पठाइयो। धन्यवाद।',
  'Submit Application?': 'आवेदन पठाउने?',
  'Yes, Apply Now': 'हो, आवेदन पठाउनुहोस्',
  'My applications': 'मेरा आवेदन',
  'Track every application and its latest status.': 'सबै आवेदन र तिनको अवस्था हेर्नुहोस्।',
  'No applications': 'आवेदन छैन',
  'Apply to a job and track its status here.': 'काममा आवेदन दिनुहोस् र अवस्था यहाँ हेर्नुहोस्।',
  'Find jobs': 'काम खोज्नुहोस्',
  'Your collection': 'तपाईंको सूची',
  'Keep track of opportunities that matter to you.': 'महत्त्वपूर्ण अवसरहरू सुरक्षित राख्नुहोस्।',
  'Jobs you save will appear here.': 'तपाईंले सेभ गरेका काम यहाँ देखिन्छन्।',

  // Profiles
  'A complete profile gets more job matches and provider trust.': 'पूरा प्रोफाइलले मिल्ने काम र रोजगारदाताको भरोसा बढाउँछ।',
  'Saved': 'सेभ भयो',
  'Basic Information': 'आधारभूत जानकारी',
  'Name': 'नाम',
  'Bio': 'आफ्नो बारेमा',
  'Profile image URL': 'प्रोफाइल फोटो URL',
  'Mornings only': 'बिहान मात्र',
  'Afternoons': 'दिउँसो',
  'Full day': 'पूरा दिन',
  'Flexible': 'लचिलो',
  'Skills': 'सीप',
  'No skills added yet.': 'अझै सीप थपिएको छैन।',
  'Field': 'विषय',
  'Institution': 'संस्था',
  'Year': 'वर्ष',
  'No qualifications added yet.': 'अझै योग्यता थपिएको छैन।',
  'Work Experience': 'कामको अनुभव',
  'Role': 'भूमिका',
  'Company': 'कम्पनी',
  'Description': 'विवरण',
  'No experience added yet.': 'अझै अनुभव थपिएको छैन।',
  'Available Dates': 'उपलब्ध मिति',
  'Add': 'थप्नुहोस्',
  'No specific dates added.': 'निश्चित मिति थपिएको छैन।',
  'No completed jobs yet.': 'अझै पूरा भएको काम छैन।',
  'No ratings yet': 'अझै मूल्याङ्कन छैन',
  'New worker': 'नयाँ कामदार',
  'Identity Verification / KYC': 'पहिचान प्रमाणीकरण / KYC',
  'Private account information': 'गोप्य खाता जानकारी',
  'Verification is optional during signup, but your identity must be verified before you can apply for jobs. Your document number and uploaded file are never shown on your public profile.': 'दर्ता गर्दा KYC आवश्यक छैन, तर काममा आवेदन दिन पहिचान प्रमाणित हुनुपर्छ। कागजात नम्बर र अपलोड गरिएको फाइल सार्वजनिक प्रोफाइलमा देखाइँदैन।',
  'Not Verified': 'प्रमाणित नभएको',
  'Pending Verification': 'प्रमाणीकरण बाँकी',
  'Identity Verified': 'पहिचान प्रमाणित',
  'Identity verified': 'पहिचान प्रमाणित',
  'Identity document': 'पहिचान कागजात',
  'Nepal National ID (NID)': 'नेपाल राष्ट्रिय परिचयपत्र (NID)',
  'Nepal Citizenship Certificate': 'नेपाली नागरिकता प्रमाणपत्र',
  'Passport': 'राहदानी',
  'Driving Licence': 'सवारी चालक अनुमतिपत्र',
  'Document number': 'कागजात नम्बर',
  'Document upload': 'कागजात अपलोड',
  'Enter your document number': 'कागजात नम्बर लेख्नुहोस्',
  'JPG, PNG or PDF. Maximum file size: 2 MB.': 'JPG, PNG वा PDF। अधिकतम फाइल साइज: २ MB।',
  'No document selected.': 'कागजात छानिएको छैन।',
  'Submit for Verification': 'प्रमाणीकरणका लागि पठाउनुहोस्',
  'Your identity document is waiting for review.': 'तपाईंको पहिचान कागजात समीक्षा हुन बाँकी छ।',
  'Demo Admin: Approve KYC': 'डेमो एडमिन: KYC स्वीकृत',
  'Your identity is verified. You can apply for jobs.': 'तपाईंको पहिचान प्रमाणित भयो। अब काममा आवेदन दिन सक्नुहुन्छ।',
  'KYC submitted for verification.': 'KYC प्रमाणीकरणका लागि पठाइयो।',
  'Identity verification required': 'पहिचान प्रमाणीकरण आवश्यक',
  'Your KYC is pending verification. You can apply after it is approved.': 'तपाईंको KYC समीक्षा हुँदैछ। स्वीकृत भएपछि आवेदन दिन सक्नुहुन्छ।',
  'Complete identity verification in your profile before applying for jobs.': 'काममा आवेदन दिनुअघि प्रोफाइलमा पहिचान प्रमाणीकरण पूरा गर्नुहोस्।',
  'Complete KYC': 'KYC पूरा गर्नुहोस्',
  'Identity Verified': 'पहिचान प्रमाणित',
  'Your identity verification was approved. You can now apply for jobs.': 'तपाईंको पहिचान प्रमाणीकरण स्वीकृत भयो। अब काममा आवेदन दिन सक्नुहुन्छ।',
  'Only worker accounts can submit identity verification.': 'कामदार खाताले मात्र पहिचान प्रमाणीकरण पठाउन सक्छ।',
  'Enter the document number.': 'कागजात नम्बर लेख्नुहोस्।',
  'Upload a clear identity document.': 'स्पष्ट पहिचान कागजात अपलोड गर्नुहोस्।',
  'The document is too large. Use a file smaller than 2 MB.': 'कागजात धेरै ठूलो छ। २ MB भन्दा सानो फाइल प्रयोग गर्नुहोस्।',

  // Provider pages
  'Active Jobs': 'सक्रिय काम',
  'Total Posted': 'कुल पोस्ट',
  'Total Applicants': 'कुल आवेदक',
  'Workers Hired': 'राखिएका कामदार',
  'No active jobs': 'सक्रिय काम छैन',
  'Post your first job to start receiving applications.': 'आवेदन पाउन पहिलो काम पोस्ट गर्नुहोस्।',
  'All jobs': 'सबै काम',
  '+ Post Job': '+ काम पोस्ट',
  'Review Applicants →': 'आवेदक हेर्नुहोस् →',
  'Spots filled': 'भरिएका स्थान',
  'Quick Actions': 'छिटो काम',
  '+ Post New Job': '+ नयाँ काम पोस्ट',
  'View All Jobs': 'सबै काम हेर्नुहोस्',
  'Organisation Profile': 'संस्थाको प्रोफाइल',
  'Recent Applicants': 'हालका आवेदक',
  'No applicants yet': 'अझै आवेदक छैनन्',
  'Verification Pending': 'प्रमाणीकरण बाँकी',
  'Verified Provider': 'प्रमाणित रोजगारदाता',
  'Manage your organisation’s public profile.': 'संस्थाको सार्वजनिक प्रोफाइल व्यवस्थापन गर्नुहोस्।',
  'Organisation Details': 'संस्थाको विवरण',
  'Contact Person': 'सम्पर्क व्यक्ति',
  'PAN Number': 'PAN नम्बर',
  'Organisation Description': 'संस्थाको परिचय',
  'Hiring Stats': 'भर्ती तथ्याङ्क',
  'Total Workers Hired': 'कुल राखिएका कामदार',
  'Provider Rating': 'रोजगारदाता मूल्याङ्कन',
  'Worker Reviews': 'कामदार समीक्षा',
  'Build Worker Trust': 'कामदारको भरोसा बढाउनुहोस्',
  'Submit PAN Verification': 'PAN प्रमाणीकरण पठाउनुहोस्',
  'Manage your job postings and review applicants.': 'आफ्ना काम पोस्ट र आवेदक व्यवस्थापन गर्नुहोस्।',
  '+ Post Job': '+ काम पोस्ट',
  'No jobs here': 'यहाँ काम छैन',
  "You haven't posted any jobs yet.": 'तपाईंले अझै काम पोस्ट गर्नुभएको छैन।',
  'Post Your First Job': 'पहिलो काम पोस्ट गर्नुहोस्',
  'View Applicants': 'आवेदक हेर्नुहोस्',
  'Edit job': 'काम सम्पादन',
  'Close job': 'काम बन्द',
  'Delete job': 'काम मेटाउनुहोस्',
  'Delete this job?': 'यो काम मेटाउने?',
  'Delete Job': 'काम मेटाउनुहोस्',
  'Post a New Job': 'नयाँ काम पोस्ट गर्नुहोस्',
  'Edit Job Posting': 'काम पोस्ट सम्पादन',
  'Job Basics': 'कामको आधार',
  'Job Information': 'कामको जानकारी',
  'Job Title': 'कामको शीर्षक',
  'Job Category': 'कामको श्रेणी',
  'Professional / Qualified': 'व्यावसायिक / योग्य',
  'Skill Based': 'सीपमा आधारित',
  'Beginner Friendly': 'नयाँका लागि',
  'Number of Workers Needed': 'चाहिने कामदार संख्या',
  'Skills & Requirements': 'सीप र आवश्यकता',
  'Qualification Required': 'चाहिने योग्यता',
  'Experience Required': 'चाहिने अनुभव',
  'Work Location': 'कामको स्थान',
  'Schedule & Payment': 'समय र भुक्तानी',
  'Start Date': 'सुरु मिति',
  'End Date': 'अन्तिम मिति',
  'Start Time': 'सुरु समय',
  'End Time': 'अन्तिम समय',
  'Application Deadline': 'आवेदन म्याद',
  'Payment Amount (NPR)': 'भुक्तानी रकम (NPR)',
  'Payment Type': 'भुक्तानी प्रकार',
  'Per Day': 'प्रति दिन',
  'Per Hour': 'प्रति घण्टा',
  'Fixed (total)': 'एकमुष्ट',
  'day': 'दिन',
  'hour': 'घण्टा',
  'fixed': 'एकमुष्ट',
  'Full Day': 'पूरा दिन',
  'Half Day': 'आधा दिन',
  'Hourly': 'घण्टाको',
  'Multi-Day': 'धेरै दिन',
  'full day': 'पूरा दिन',
  'half day': 'आधा दिन',
  'hourly': 'घण्टाको',
  'multi day': 'धेरै दिन',
  'Job Summary Preview': 'कामको सारांश',
  'Untitled Job': 'शीर्षक नभएको काम',
  'Post Job →': 'काम पोस्ट →',
  'Save Changes': 'परिवर्तन सेभ',
  'Job Posted Successfully!': 'काम सफलतापूर्वक पोस्ट भयो!',
  'Job Updated!': 'काम अपडेट भयो!',
  'View My Jobs': 'मेरा काम हेर्नुहोस्',
  'Back to My Jobs': 'मेरा काममा फर्कनुहोस्',
  'Applicant management': 'आवेदक व्यवस्थापन',
  'Pending Review': 'समीक्षा बाँकी',
  'Accept': 'स्वीकार',
  'Shortlist': 'छनोट सूची',
  'Accept this applicant?': 'यो आवेदक स्वीकार गर्ने?',
  'Yes, Accept': 'हो, स्वीकार',
  'Not selecting this applicant?': 'यो आवेदक नछान्ने?',
  'Save review': 'समीक्षा सेभ',
  'Short review of the worker': 'कामदारको छोटो समीक्षा',
  'Cover note:': 'आवेदन नोट:',
  'Your note:': 'तपाईंको नोट:',
  'View full profile ↓': 'पूरा प्रोफाइल हेर्नुहोस् ↓',
  'Show less ↑': 'कम देखाउनुहोस् ↑',

  // Notifications and dialogs
  'Notifications': 'सूचना',
  'Mark all read': 'सबै पढिएको बनाउनुहोस्',
  'No notifications yet': 'अझै सूचना छैन',
  'New Applicant': 'नयाँ आवेदक',
  'Application Accepted!': 'आवेदन स्वीकृत भयो!',
  "You've been Shortlisted": 'तपाईं छनोट सूचीमा पर्नुभयो',
  'Application Update': 'आवेदन अपडेट',
  'Job Updated': 'काम अपडेट भयो',
  'Job Removed': 'काम हटाइयो',
  'Confirm': 'पक्का गर्नुहोस्',

  // Nepal districts and predefined marketplace skills
  'Kathmandu': 'काठमाडौं',
  'Lalitpur': 'ललितपुर',
  'Bhaktapur': 'भक्तपुर',
  'Pokhara': 'पोखरा',
  'Biratnagar': 'विराटनगर',
  'Birgunj': 'वीरगञ्ज',
  'Dharan': 'धरान',
  'Butwal': 'बुटवल',
  'Hetauda': 'हेटौंडा',
  'Bharatpur': 'भरतपुर',
  'Dhangadhi': 'धनगढी',
  'Nepalgunj': 'नेपालगञ्ज',
  'Electrical Wiring': 'विद्युत् वायरिङ',
  'Plumbing': 'प्लम्बिङ',
  'Carpentry': 'सिकर्मी',
  'Masonry': 'डकर्मी',
  'Welding': 'वेल्डिङ',
  'Computer Repair': 'कम्प्युटर मर्मत',
  'Network Setup': 'नेटवर्क जडान',
  'IT Support': 'आईटी सहयोग',
  'Data Entry': 'डाटा इन्ट्री',
  'Typing': 'टाइपिङ',
  'Cooking': 'खाना पकाउने',
  'Baking': 'बेकिङ',
  'Barista': 'बारिस्ता',
  'Waiter Service': 'वेटर सेवा',
  'Kitchen Helper': 'भान्सा सहयोगी',
  'Driving (LMV)': 'हलुका सवारी चालक',
  'Driving (HMV)': 'ठूलो सवारी चालक',
  'Forklift Operation': 'फोर्कलिफ्ट सञ्चालन',
  'Event Setup': 'कार्यक्रम तयारी',
  'Crowd Management': 'भीड व्यवस्थापन',
  'Security Guard': 'सुरक्षा गार्ड',
  'Teaching': 'शिक्षण',
  'English Language': 'अङ्ग्रेजी भाषा',
  'Maths Tutoring': 'गणित ट्युसन',
  'Nursing': 'नर्सिङ',
  'First Aid': 'प्राथमिक उपचार',
  'Patient Care': 'बिरामी हेरचाह',
  'Accounting': 'लेखा',
  'Bookkeeping': 'हिसाब राख्ने',
  'Tally ERP': 'ट्याली ERP',
  'Sales': 'बिक्री',
  'Customer Service': 'ग्राहक सेवा',
  'Reception': 'रिसेप्सन',
  'Tailoring': 'सिलाइ',
  'Stitching': 'सिलाइ काम',
  'Embroidery': 'कढाइ',
  'Solar Installation': 'सोलार जडान',
  'Generator Maintenance': 'जेनेरेटर मर्मत',
  'Panel Installation': 'प्यानल जडान',
  'Graphic Design': 'ग्राफिक डिजाइन',
  'Photography': 'फोटोग्राफी',
  'Video Editing': 'भिडियो सम्पादन',
  'Physical Labour': 'शारीरिक श्रम',
  'Loading/Unloading': 'सामान चढाउने/ओराल्ने',
  'Cleaning': 'सरसफाइ',

  // Remaining page copy, filters and states
  'Back to jobs': 'काममा फर्कनुहोस्',
  'All districts': 'सबै जिल्ला',
  'All types': 'सबै प्रकार',
  'Applied': 'आवेदन दिइयो',
  'Total Applied': 'कुल आवेदन',
  "Bookmark jobs you're interested in so you can apply later.": 'पछि आवेदन दिन चाहेका काम सेभ गरेर राख्नुहोस्।',
  'Deadline Soon': 'म्याद नजिक',
  'Highest Pay': 'धेरै भुक्तानी',
  'Lowest Pay': 'थोरै भुक्तानी',
  'Newest': 'नयाँ',
  'Min Pay (NPR/day)': 'न्यूनतम भुक्तानी (NPR/दिन)',
  'No applications here': 'यहाँ आवेदन छैन',
  'No applications yet.': 'अझै आवेदन छैन।',
  'No saved jobs': 'सेभ गरेको काम छैन',
  'No experience listed': 'अनुभव लेखिएको छैन',
  'None listed': 'केही लेखिएको छैन',
  'Optionally leave a note for the applicant (visible to them).': 'चाहेमा आवेदकका लागि देखिने नोट लेख्नुहोस्।',
  'Qualified / Professional': 'योग्य / व्यावसायिक',
  'Select district': 'जिल्ला छान्नुहोस्',
  'Select industry': 'उद्योग छान्नुहोस्',
  'Setting up your account…': 'खाता तयार हुँदैछ…',
  'Track the status of all your job applications.': 'आफ्ना सबै आवेदनको अवस्था हेर्नुहोस्।',
  'Try adjusting your search or removing some filters.': 'खोज परिवर्तन गर्नुहोस् वा केही फिल्टर हटाउनुहोस्।',
  "You've been shortlisted. Final decision coming soon.": 'तपाईं छनोट सूचीमा पर्नुभयो। अन्तिम निर्णय चाँडै आउँछ।',
  'Your cover note:': 'तपाईंको आवेदन नोट:',
  'average rating': 'औसत मूल्याङ्कन',
  'workers hired': 'कामदार राखिए',
  'View Details →': 'विवरण हेर्नुहोस् →',
  '✓ Saved': 'सेभ भयो',
  'No specific dates added; treated as generally available.': 'निश्चित मिति छैन; सामान्य रूपमा उपलब्ध मानिन्छ।',
  'Flexible': 'लचिलो',
  'flexible': 'लचिलो',
  'morning': 'बिहान',
  'afternoon': 'दिउँसो',
  'full-day': 'पूरा दिन',
  'half-day': 'आधा दिन',
  'multi-day': 'धेरै दिन',
  'No completed jobs yet': 'अझै पूरा भएको काम छैन',
  'No completed jobs yet.': 'अझै पूरा भएको काम छैन।',
  "Manage your organisation's public profile.": 'संस्थाको सार्वजनिक प्रोफाइल व्यवस्थापन गर्नुहोस्।',
  'Job not found.': 'काम भेटिएन।',
  'Reports are stored for review and duplicate reports are prevented. Reporting does not add chat, public arguments or complicated case management.': 'रिपोर्ट समीक्षा गर्न सुरक्षित राखिन्छ र एउटै रिपोर्ट दोहोरिन दिइँदैन। यो प्रक्रिया सरल राखिएको छ।',
  '✓ Complete organisation description': 'संस्थाको परिचय पूरा गर्नुहोस्',
  '✓ Verify your PAN registration': 'PAN दर्ता प्रमाणित गर्नुहोस्',
  '✓ Post detailed job descriptions': 'कामको स्पष्ट विवरण पोस्ट गर्नुहोस्',
  '✓ Respond to applicants promptly': 'आवेदकलाई समयमा जवाफ दिनुहोस्',
  '✓ Maintain high worker ratings': 'राम्रो कामदार मूल्याङ्कन कायम राख्नुहोस्',
  '© 2024 Shrama Pvt. Ltd.': '© २०२४ श्रम प्रा. लि.',
  '© 2026 Shrama': '© २०२६ श्रम',
  '9-digit PAN': '९ अङ्कको PAN',
  'At least 8 characters': 'कम्तीमा ८ अक्षर',
  'Describe the role, responsibilities, and what you expect from workers. The more detail, the better the match.': 'काम, जिम्मेवारी र कामदारबाट अपेक्षा गरिएको कुरा स्पष्ट लेख्नुहोस्।',
  'Optional — leave blank to use your initial': 'ऐच्छिक — खाली छोड्दा नामको पहिलो अक्षर देखिन्छ',
  'Search skills to add…': 'थप्न सीप खोज्नुहोस्…',
  'Search skills…': 'सीप खोज्नुहोस्…',
  'e.g. 1 day, 3 days, 2 weeks': 'जस्तै: १ दिन, ३ दिन, २ हप्ता',
  'e.g. 3 years': 'जस्तै: ३ वर्ष',
  'e.g. Electrical': 'जस्तै: विद्युत्',
  'e.g. Electrician for Office Renovation': 'जस्तै: कार्यालय मर्मतका लागि इलेक्ट्रिसियन',
  'e.g. Minimum 2 years in event coordination': 'जस्तै: कार्यक्रम व्यवस्थापनमा कम्तीमा २ वर्ष',
  'e.g. SLC/SEE passed, Diploma in Electrical Engineering': 'जस्तै: SEE उत्तीर्ण वा इलेक्ट्रिकल डिप्लोमा',
  'e.g. I have 5 years of experience in electrical work and am fully available on the dates you need…': 'जस्तै: मसँग विद्युत् काममा ५ वर्षको अनुभव छ र तोकिएको मितिमा उपलब्ध छु…',
  'e.g. We need more experience in this specific area…': 'जस्तै: यस क्षेत्रमा थप अनुभव आवश्यक छ…',
};

const reverseTranslations = Object.fromEntries(
  Object.entries(translations).map(([english, nepali]) => [nepali, english]),
);

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};
const languageGlobal = globalThis as typeof globalThis & {
  __SHRAM_BAZAR_LANGUAGE_CONTEXT__?: ReturnType<typeof createContext<LanguageContextValue>>;
};
const LanguageContext = languageGlobal.__SHRAM_BAZAR_LANGUAGE_CONTEXT__ ??
  (languageGlobal.__SHRAM_BAZAR_LANGUAGE_CONTEXT__ = createContext<LanguageContextValue>({
    language: 'en',
    setLanguage: () => undefined,
  }));

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ['placeholder', 'title', 'aria-label'];

function translateDynamic(value: string, language: Language) {
  const hasTranslation = language === 'ne'
    ? Object.prototype.hasOwnProperty.call(translations, value)
    : Object.prototype.hasOwnProperty.call(reverseTranslations, value);
  if (hasTranslation) return language === 'ne' ? translations[value] : reverseTranslations[value];
  if (language === 'en') return value;

  const patterns: [RegExp, (...parts: string[]) => string][] = [
    [/^Step (\d+) of (\d+) — (.+)$/, (_, current, total, label) => `चरण ${current}/${total} — ${translations[label] ?? label}`],
    [/^(\d+) jobs available · sorted by your profile match$/, (_, count) => `${count} काम उपलब्ध · प्रोफाइलअनुसार क्रम`],
    [/^(\d+) jobs available$/, (_, count) => `${count} काम उपलब्ध`],
    [/^All \((\d+)\)$/, (_, count) => `सबै (${count})`],
    [/^Active \((\d+)\)$/, (_, count) => `सक्रिय (${count})`],
    [/^Filled \((\d+)\)$/, (_, count) => `भरिएको (${count})`],
    [/^Closed \((\d+)\)$/, (_, count) => `बन्द (${count})`],
    [/^Pending \((\d+)\)$/, (_, count) => `विचाराधीन (${count})`],
    [/^Applied \((\d+)\)$/, (_, count) => `आवेदन (${count})`],
    [/^Shortlisted \((\d+)\)$/, (_, count) => `छनोट सूची (${count})`],
    [/^Accepted \((\d+)\)$/, (_, count) => `स्वीकृत (${count})`],
    [/^Not Selected \((\d+)\)$/, (_, count) => `छनोट नभएको (${count})`],
    [/^(\d+) applicants?$/, (_, count) => `${count} आवेदक`],
    [/^(\d+) workers? hired$/, (_, count) => `${count} कामदार राखियो`],
    [/^(\d+) spots? remaining$/, (_, count) => `${count} स्थान बाँकी`],
    [/^(\d+) spots? left$/, (_, count) => `${count} स्थान बाँकी`],
    [/^Applied (.+)$/, (_, date) => `${date} मा आवेदन`],
    [/^Welcome back,? (.+)$/, (_, name) => `फेरि स्वागत छ, ${name}`],
    [/^\((\d+) completed\)$/, (_, count) => `(${count} पूरा)`],
    [/^(.+) applied for "(.+)"\.$/, (_, worker, job) => `${worker} ले “${job}” का लागि आवेदन दिए।`],
    [/^Your application for "(.+)" is now (pending|shortlisted|accepted|rejected)\.(.*)$/, (_, job, status, note) => `“${job}” को आवेदन ${translations[status[0].toUpperCase() + status.slice(1)] ?? status} भयो।${note}`],
    [/^"(.+)" was updated by the provider\.$/, (_, job) => `रोजगारदाताले “${job}” अपडेट गरे।`],
    [/^"(.+)" was removed by the provider\.$/, (_, job) => `रोजगारदाताले “${job}” हटाए।`],
    [/^NPR ([\d,]+) \/ (.+)$/, (_, amount, basis) => `NPR ${amount} / ${translations[basis] ?? basis}`],
    [/^You're applying to "(.+)" at (.+)\. Your full profile and cover note will be shared with the provider\.$/, (_, job, provider) => `तपाईं ${provider} को “${job}” मा आवेदन दिँदै हुनुहुन्छ। तपाईंको प्रोफाइल र आवेदन नोट रोजगारदाताले हेर्नेछन्।`],
    [/^You're accepting (.+) for "(.+)"\. They will be notified immediately\.$/, (_, worker, job) => `तपाईं “${job}” का लागि ${worker} लाई स्वीकार गर्दै हुनुहुन्छ। उनीहरूलाई तुरुन्त सूचना जान्छ।`],
  ];
  for (const [pattern, replacement] of patterns) {
    const match = value.match(pattern);
    if (match) return replacement(...match);
  }
  return value;
}

function translateDocument(language: Language) {
  document.documentElement.lang = language === 'ne' ? 'ne' : 'en';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (!node.parentElement || ['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)) continue;
    const current = node.nodeValue ?? '';
    const trimmed = current.trim();
    if (!trimmed) continue;

    let source = originalText.get(node);
    if (!source) {
      source = trimmed;
      originalText.set(node, source);
    } else {
      const expected = translateDynamic(source, 'ne');
      if (trimmed !== source && trimmed !== expected) {
        source = trimmed;
        originalText.set(node, source);
      }
    }
    const translated = language === 'ne' ? translateDynamic(source, 'ne') : source;
    if (trimmed !== translated) {
      node.nodeValue = current.replace(trimmed, translated);
    }
  }

  document.querySelectorAll('*').forEach(element => {
    let stored = originalAttributes.get(element);
    if (!stored) {
      stored = new Map();
      originalAttributes.set(element, stored);
    }
    translatedAttributes.forEach(attribute => {
      const current = element.getAttribute(attribute);
      if (!current) return;
      const source = stored!.get(attribute);
      if (!source) stored!.set(attribute, current);
      const original = stored!.get(attribute) ?? current;
      const translated = language === 'ne' ? translateDynamic(original, 'ne') : original;
      if (current !== translated) element.setAttribute(attribute, translated);
    });
  });
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    localStorage.getItem(LANGUAGE_KEY) === 'ne' ? 'ne' : 'en',
  );

  const setLanguage = (nextLanguage: Language) => {
    localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  };

  useLayoutEffect(() => translateDocument(language), [language]);
  useEffect(() => {
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')
      .forEach(element => element.setCustomValidity(''));

    const handleInvalid = (event: Event) => {
      if (language !== 'ne') return;
      const field = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (field.validity.valueMissing) field.setCustomValidity('यो विवरण भर्नुहोस्।');
      else if (field.validity.typeMismatch) field.setCustomValidity('सही ढाँचामा विवरण लेख्नुहोस्।');
      else if (field.validity.tooShort) field.setCustomValidity(`कम्तीमा ${field.minLength} अक्षर लेख्नुहोस्।`);
      else if (field.validity.rangeUnderflow) field.setCustomValidity(`कम्तीमा ${field.min} राख्नुहोस्।`);
      else field.setCustomValidity('यो विवरण जाँच गर्नुहोस्।');
    };
    const clearValidation = (event: Event) => {
      (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).setCustomValidity?.('');
    };
    document.addEventListener('invalid', handleInvalid, true);
    document.addEventListener('input', clearValidation, true);
    return () => {
      document.removeEventListener('invalid', handleInvalid, true);
      document.removeEventListener('input', clearValidation, true);
    };
  }, [language]);
  useEffect(() => {
    const observer = new MutationObserver(() => translateDocument(language));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitch({ inline = false }: { inline?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'ne' : 'en')}
      className={`${inline ? '' : 'fixed right-4 top-4 z-50 shadow-sm'} inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/95 px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50`}
      aria-label={language === 'en' ? 'Switch to Nepali' : 'Switch to English'}
      title={language === 'en' ? 'Switch to Nepali' : 'Switch to English'}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M3 12h18M12 3a15 15 0 0 1 0 18m0-18a15 15 0 0 0 0 18" />
      </svg>
      <span>{language === 'en' ? 'EN' : 'ने'}</span>
    </button>
  );
}
