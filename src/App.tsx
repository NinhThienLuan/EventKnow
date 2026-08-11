import React, { useState } from 'react';
import { ArrowLeft, Plus, FileText, Network } from 'lucide-react';
import { Header } from './components/Header';
import { SourceTree } from './components/SourceTree';
import { PromptSection } from './components/PromptSection';
import { ReportView } from './components/ReportView';
import { RecentReports } from './components/RecentReports';
import { SidePanel } from './components/SidePanel';
import { SourceSelectorModal } from './components/SourceSelectorModal';
import { UploadView } from './components/UploadView';
import { ExtractionJobsView } from './components/ExtractionJobsView';
import { ConnectionsView } from './components/ConnectionsView';
import { MergeSplitView } from './components/MergeSplitView';
import { AliasView } from './components/AliasView';
import { MappingView } from './components/MappingView';
import { AdminMgmtView } from './components/AdminMgmtView';
import { PersonnelMgmtView } from './components/PersonnelMgmtView';
import { DashboardAnalyticsView } from './components/DashboardAnalyticsView';
import { PartnersMgmtView } from './components/PartnersMgmtView';
import { GoogleAuthModal, UserProfile } from './components/GoogleAuthModal';
import { GoogleDrivePicker, DriveFileItem } from './components/GoogleDrivePicker';

import { MOCK_REPORTS, SUGGESTION_CARDS, RECENT_REPORTS_LIST, MOCK_CITATIONS, MOCK_EVENT_RECORDS } from './data/mockData';
import { AIReport, CitationSource, SuggestionCard } from './types';

export default function App() {
  const [language, setLanguage] = useState<'VN' | 'EN'>('VN');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeNavView, setActiveNavView] = useState<string>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('db-core');
  const [activeSimulatedEmail, setActiveSimulatedEmail] = useState<string>('luanninh2005@gmail.com');

  // Google OAuth User State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('eventknow_user_profile');
      return saved ? JSON.parse(saved) : { name: '', email: '', isLoggedIn: false };
    } catch {
      return { name: '', email: '', isLoggedIn: false };
    }
  });

  const handleSaveUserProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    try {
      localStorage.setItem('eventknow_user_profile', JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save user profile', e);
    }
  };

  const handleLogoutUser = () => {
    const loggedOut: UserProfile = { name: '', email: '', isLoggedIn: false };
    setUserProfile(loggedOut);
    try {
      localStorage.removeItem('eventknow_user_profile');
    } catch (e) {
      console.error('Failed to clear user profile', e);
    }
  };

  const handleGrantDrivePermission = (accessToken?: string) => {
    const currentScopes = userProfile.scopes ? [...userProfile.scopes] : [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];
    if (!currentScopes.some(s => s.includes('drive.file'))) {
      currentScopes.push('https://www.googleapis.com/auth/drive.file');
    }
    const updatedProfile = {
      ...userProfile,
      isLoggedIn: true,
      accessToken: accessToken || userProfile.accessToken,
      scopes: currentScopes,
    };
    handleSaveUserProfile(updatedProfile);
  };

  // Google Drive Picker Modal State
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState<boolean>(false);

  const handleImportDriveFiles = (files: DriveFileItem[]) => {
    const newNames = files.map(f => f.name);
    setSelectedSources(prev => {
      const combined = [...prev];
      newNames.forEach(name => {
        if (!combined.includes(name)) combined.push(name);
      });
      return combined;
    });
    alert(
      language === 'VN'
        ? `Đã trích xuất thành công ${files.length} tệp từ Google Drive vào EventKnow Knowledge Base!`
        : `Successfully imported ${files.length} files from Google Drive into EventKnow Knowledge Base!`
    );
  };

  const [activeCategory, setActiveCategory] = useState<string>('data-discovery');
  const [selectedCardId, setSelectedCardId] = useState<string>('card-1');
  const [promptInput, setPromptInput] = useState<string>(
    'Phân tích xu hướng chuyên gia AI 2024 tại các hội thảo công nghệ'
  );

  const [currentReport, setCurrentReport] = useState<AIReport>(MOCK_REPORTS['report-1']);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [sidePanelOpen, setSidePanelOpen] = useState<boolean>(false);
  const [selectedCitationId, setSelectedCitationId] = useState<string | undefined>(undefined);

  const [selectedSources, setSelectedSources] = useState<string[]>(['Event DB Core']);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);

  // Handle Card Selection
  const handleSelectCard = (card: SuggestionCard) => {
    setSelectedCardId(card.id);
    setPromptInput(card.title);

    // Map to corresponding mock report if available or run query
    if (card.id === 'card-1') {
      setCurrentReport(MOCK_REPORTS['report-1']);
      setActiveNavView('reports');
    } else if (card.id === 'card-2') {
      setCurrentReport(MOCK_REPORTS['report-2']);
      setActiveNavView('reports');
    } else if (card.id === 'card-3') {
      setCurrentReport(MOCK_REPORTS['report-3']);
      setActiveNavView('reports');
    } else {
      // Run custom query logic
      handleSubmitQuery(card.title);
    }
  };

  // Submit Query to Gemini API Server Route `/api/analyze`
  const handleSubmitQuery = async (queryText: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          sourceIds: selectedSources
        })
      });

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        const aiData = result.data;
        const newReport: AIReport = {
          id: `rep-${Date.now().toString().slice(-4)}`,
          title: aiData.title || queryText,
          queryPrompt: queryText,
          timestamp: new Date().toLocaleDateString('vi-VN') + ' - ' + new Date().toLocaleTimeString('vi-VN'),
          author: 'EventKnow Gemini AI v3.6',
          sourcesUsed: selectedSources.length,
          summaryParagraphs: aiData.summaryParagraphs || [
            `Phân tích dữ liệu sự kiện cho câu hỏi "${queryText}" [EVT-2024-08]. Dữ liệu đã được kiểm chứng từ các hội thảo khoa học và diễn đàn công nghệ quốc gia.`
          ],
          citations: MOCK_CITATIONS,
          tableData: MOCK_EVENT_RECORDS,
          relatedNodes: MOCK_REPORTS['report-1'].relatedNodes,
          relatedLinks: MOCK_REPORTS['report-1'].relatedLinks,
          keyInsights: aiData.keyInsights || [
            'Hệ thống đã tự động đối soát thông tin qua các cổng dữ liệu chính thống.',
            'Tự động tạo mã bản ghi trích dẫn chuẩn hóa theo Quiet Authority Standard.'
          ]
        };
        setCurrentReport(newReport);
        setActiveNavView('reports');
      } else {
        // Fallback mock report generation based on prompt
        const fallbackReport: AIReport = {
          ...MOCK_REPORTS['report-1'],
          id: `rep-${Date.now().toString().slice(-4)}`,
          title: queryText,
          queryPrompt: queryText,
          timestamp: new Date().toLocaleDateString('vi-VN') + ' - ' + new Date().toLocaleTimeString('vi-VN')
        };
        setCurrentReport(fallbackReport);
        setActiveNavView('reports');
      }
    } catch (err) {
      console.warn('API fetch error, fallback to client synthesis:', err);
      const fallbackReport: AIReport = {
        ...MOCK_REPORTS['report-1'],
        id: `rep-${Date.now().toString().slice(-4)}`,
        title: queryText,
        queryPrompt: queryText
      };
      setCurrentReport(fallbackReport);
      setActiveNavView('reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCitation = (cit: CitationSource) => {
    setSelectedCitationId(cit.id);
    setSidePanelOpen(true);
  };

  const handleSelectRecentReport = (reportId: string) => {
    if (MOCK_REPORTS[reportId]) {
      setCurrentReport(MOCK_REPORTS[reportId]);
      setPromptInput(MOCK_REPORTS[reportId].queryPrompt);
      setActiveNavView('reports');
    }
  };

  const handleToggleSource = (sourceId: string) => {
    setSelectedSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(s => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  return (
    <div className={`h-screen w-full overflow-hidden bg-[#f7f9ff] text-[#0f1d28] font-body flex flex-col antialiased transition-colors ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* Top Header */}
      <Header
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        userProfile={userProfile}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Workspace Hybrid Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Navigation Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Left 2-Tab Sidebar Rail (Persistent on lg+, Slide-Over Drawer on Mobile/Tablet) */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
            transform lg:transform-none transition-transform duration-200 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
            h-full flex shrink-0
          `}
        >
          <SourceTree
            selectedSourceId={selectedSourceId}
            onSelectSource={setSelectedSourceId}
            onSelectReport={(reportId) => {
              handleSelectRecentReport(reportId);
              setIsMobileMenuOpen(false);
            }}
            language={language}
            activeNavView={activeNavView}
            onSelectNavView={(viewId) => {
              setActiveNavView(viewId);
              setIsMobileMenuOpen(false);
            }}
          />
        </div>

        {/* Central Fluid Dashboard, Views or Home Area */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 min-w-0">
          {activeNavView === 'reports' ? (
            <div className="space-y-4 max-w-5xl mx-auto w-full animate-fade-in">
              {/* Toolbar for Dedicated Report Reading View */}
              <div className="bg-white border border-[#DCE1E6] rounded-xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setActiveNavView('home')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#00344c] bg-[#EEF1F4] hover:bg-[#DCE1E6] rounded-md transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{language === 'VN' ? 'Trang chủ' : 'Home'}</span>
                  </button>

                  <div className="h-4 w-px bg-[#DCE1E6] hidden sm:block" />

                  {/* Selector to switch between available reports */}
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#1b4b66] shrink-0" />
                    <select
                      value={currentReport.id}
                      onChange={(e) => handleSelectRecentReport(e.target.value)}
                      className="pl-2 pr-7 py-1.5 text-xs font-bold text-[#00344c] bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c] cursor-pointer max-w-[200px] sm:max-w-[320px] truncate"
                    >
                      {Object.values(MOCK_REPORTS).map(rep => (
                        <option key={rep.id} value={rep.id}>
                          {rep.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setSidePanelOpen(!sidePanelOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer border ${
                      sidePanelOpen
                        ? 'bg-[#5B4B8A] text-white border-[#5B4B8A]'
                        : 'bg-[#EEF1F4] text-[#5B4B8A] border-[#DCE1E6] hover:bg-[#DCE1E6]'
                    }`}
                    title={language === 'VN' ? 'Mở/đóng Phân tích kết nối & Bối cảnh' : 'Toggle Connections & Context Panel'}
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>{language === 'VN' ? (sidePanelOpen ? 'Ẩn sơ đồ kết nối' : 'Sơ đồ kết nối & Bối cảnh') : (sidePanelOpen ? 'Hide Context' : 'Connections & Context')}</span>
                  </button>

                  <button
                    onClick={() => setActiveNavView('home')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#00344c] hover:bg-[#1b4b66] rounded-md transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'VN' ? 'Tạo báo cáo mới' : 'New Report Query'}</span>
                  </button>
                </div>
              </div>

              {/* Dedicated Report Reading View Component */}
              <ReportView
                report={currentReport}
                onSelectCitation={handleSelectCitation}
                language={language}
              />
            </div>
          ) : activeNavView === 'upload' ? (
            <UploadView
              language={language}
              userProfile={userProfile}
              onOpenDrivePicker={() => setIsDrivePickerOpen(true)}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onExtractionComplete={(fileName) => {
                // Automatically add to selected sources and refresh
                if (!selectedSources.includes(fileName)) {
                  setSelectedSources(prev => [...prev, fileName]);
                }
              }}
            />
          ) : (activeNavView === 'jobs' || activeNavView === 'extraction-jobs') ? (
            <ExtractionJobsView language={language} />
          ) : activeNavView === 'dashboard' ? (
            <DashboardAnalyticsView
              language={language}
              onNavigateToPrompt={(q) => {
                setPromptInput(q);
                setActiveNavView('home');
              }}
            />
          ) : activeNavView === 'partners' ? (
            <PartnersMgmtView
              language={language}
              onNavigateToMergeSplit={() => setActiveNavView('merge-split')}
            />
          ) : activeNavView === 'connections' ? (
            <ConnectionsView language={language} />
          ) : activeNavView === 'merge-split' ? (
            <MergeSplitView language={language} />
          ) : activeNavView === 'alias' ? (
            <AliasView language={language} />
          ) : activeNavView === 'mapping' ? (
            <MappingView language={language} />
          ) : activeNavView === 'personnel' ? (
            <PersonnelMgmtView
              language={language}
              activeSimulatedEmail={activeSimulatedEmail}
              onChangeSimulatedEmail={setActiveSimulatedEmail}
              initialSubTab="DEPARTMENTS"
            />
          ) : activeNavView === 'admin-mgmt' ? (
            <PersonnelMgmtView
              language={language}
              activeSimulatedEmail={activeSimulatedEmail}
              onChangeSimulatedEmail={setActiveSimulatedEmail}
              initialSubTab="ADMINS"
            />
          ) : (
            <>
              {/* Hero Query Section */}
              <PromptSection
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                selectedCardId={selectedCardId}
                onSelectCard={handleSelectCard}
                suggestionCards={SUGGESTION_CARDS}
                promptInput={promptInput}
                setPromptInput={setPromptInput}
                onSubmitQuery={handleSubmitQuery}
                isLoading={isLoading}
                selectedSourceLabel={`${selectedSources.length} Nguồn: ${selectedSources[0] || 'Chưa chọn'}`}
                onOpenSourceModal={() => setIsSourceModalOpen(true)}
                language={language}
              />

              {/* Recent Reports Section ("Báo cáo gần đây") */}
              <RecentReports
                reports={RECENT_REPORTS_LIST}
                onSelectRecentReport={(reportId) => {
                  handleSelectRecentReport(reportId);
                }}
                language={language}
              />
            </>
          )}
        </main>

        {/* Right 380px Side Panel for Connections & Context (Only rendered on supported views: reports & home) */}
        {['reports', 'home'].includes(activeNavView) && (
          <SidePanel
            isOpen={sidePanelOpen}
            onClose={() => setSidePanelOpen(false)}
            report={currentReport}
            selectedCitationId={selectedCitationId}
            language={language}
          />
        )}
      </div>

      {/* Source Selector Modal */}
      <SourceSelectorModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        selectedSources={selectedSources}
        onToggleSource={handleToggleSource}
        onNavigateUpload={() => setActiveNavView('upload')}
      />

      {/* Google OAuth Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={userProfile}
        onLogin={handleSaveUserProfile}
        onLogout={handleLogoutUser}
        language={language}
      />

      {/* Google Drive Picker Modal */}
      <GoogleDrivePicker
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        userProfile={userProfile}
        onImportFiles={handleImportDriveFiles}
        language={language}
        onGrantDrivePermission={handleGrantDrivePermission}
        onOpenAuthModal={() => {
          setIsDrivePickerOpen(false);
          setIsAuthModalOpen(true);
        }}
      />
    </div>
  );
}

