'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Department { department_id: string; code: string; name: string; }
interface Semester { semester_id: string; semester_number: number; academic_year: string; }
interface Subject { subject_id: string; subject_code: string; title: string; }
interface Unit { unit_id: string; unit_number: number; title: string; }
interface UnitDocument { document_id: string; file_name: string; created_at: string; }

export default function ClassroomsPage() {
  const router = useRouter();

  // User State
  const [userRole, setUserRole] = useState<string>('STUDENT');
  const [userId, setUserId] = useState<string>('');

  // Breadcrumb / Drill-down Selection States
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedSem, setSelectedSem] = useState<Semester | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Data Arrays
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitDocs, setUnitDocs] = useState<UnitDocument[]>([]);

  // Admin Modal States
  const [showModal, setShowModal] = useState(false);
  const [inputVal1, setInputVal1] = useState('');
  const [inputVal2, setInputVal2] = useState('');

  // Teacher Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadType, setUploadType] = useState<'device' | 'link'>('device');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  // 1. Read User Role on Load
  const [documents, setDocuments] = useState<any[]>([]);
  useEffect(() => {
    const rawUser = localStorage.getItem('eko_auth_user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        setUserRole(parsed.role || 'STUDENT');
        setUserId(parsed.user_id || '');
      } catch (e) {
        console.error('Failed to parse user state', e);
      }
    }
  }, []);

  const isAdmin = userRole === 'ADMIN';
  const isFaculty = userRole === 'FACULTY' || userRole === 'ADMIN';

  // --- API Fetch Routines ---
  const fetchDepartments = () => {
    fetch('http://localhost:8000/api/v1/classrooms/departments')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setDepartments(data); })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSelectDept = (dept: Department) => {
    setSelectedDept(dept);
    setSelectedSem(null);
    setSelectedSubject(null);
    setSelectedUnit(null);

    fetch(`http://localhost:8000/api/v1/classrooms/departments/${dept.department_id}/semesters`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setSemesters(data); });
  };

  const handleSelectSem = (sem: Semester) => {
    setSelectedSem(sem);
    setSelectedSubject(null);
    setSelectedUnit(null);

    fetch(`http://localhost:8000/api/v1/classrooms/semesters/${sem.semester_id}/subjects`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setSubjects(data); });
  };

  const handleSelectSubject = (subj: Subject) => {
    setSelectedSubject(subj);
    setSelectedUnit(null);

    fetch(`http://localhost:8000/api/v1/classrooms/subjects/${subj.subject_id}/units`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setUnits(data); });
  };

  const handleSelectUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    fetchUnitDocuments(unit.unit_id);
  };

 
const fetchUnitDocuments = async (unitId: string) => {
  try {
    const token = localStorage.getItem('eko_auth_token');
    const res = await fetch(`http://localhost:8000/api/v1/classrooms/units/${unitId}/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      setDocuments(data); // Update state!
    }
  } catch (err) {
    console.error("Error loading unit documents:", err);
  }
};

useEffect(() => {
  if (selectedUnit) {
    fetchUnitDocuments(selectedUnit.unit_id);
  }
}, [selectedUnit]);

  // --- Admin Structural Entity Creation ---
  const handleAdminCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('eko_auth_token');

    let endpoint = '';
    let payload = {};

    if (!selectedDept) {
      endpoint = 'http://localhost:8000/api/v1/classrooms/departments/create';
      payload = { code: inputVal1.toUpperCase(), name: inputVal2 };
    } else if (!selectedSem) {
      endpoint = 'http://localhost:8000/api/v1/classrooms/semesters/create';
      payload = { department_id: selectedDept.department_id, semester_number: parseInt(inputVal1), academic_year: inputVal2 };
    } else if (!selectedSubject) {
      endpoint = 'http://localhost:8000/api/v1/classrooms/subjects/create';
      payload = { semester_id: selectedSem.semester_id, subject_code: inputVal1, title: inputVal2 };
    } else {
      endpoint = 'http://localhost:8000/api/v1/classrooms/units/create';
      payload = { subject_id: selectedSubject.subject_id, unit_number: parseInt(inputVal1), title: inputVal2 };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      setInputVal1('');
      setInputVal2('');
      if (!selectedDept) fetchDepartments();
      else if (!selectedSem) handleSelectDept(selectedDept);
      else if (!selectedSubject) handleSelectSem(selectedSem);
      else handleSelectSubject(selectedSubject);
    }
  };

  // --- Faculty Document Upload Handler ---
  const handleFacultyUpload = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedUnit) return;

  const token = localStorage.getItem('eko_auth_token');
  const formData = new FormData();

  formData.append('unit_id', selectedUnit.unit_id);
  formData.append('file_name', fileName);
  formData.append('upload_type', uploadType);

  if (uploadType === 'device' && selectedFile) {
    formData.append('file', selectedFile);
  } else if (uploadType === 'link') {
    formData.append('external_link', externalUrl);
  } else {
    alert("Please select a file or provide an external link.");
    return;
  }

  try {
    const res = await fetch('http://localhost:8000/api/v1/classrooms/units/upload-material', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}` // Do not manually set Content-Type header when sending FormData!
      },
      body: formData,
    });

    if (res.ok) {
      setShowUploadModal(false);
      setFileName('');
      setSelectedFile(null);
      setExternalUrl('');
      fetchUnitDocuments(selectedUnit.unit_id);
    } else {
      const err = await res.json();
      alert(`Upload failed: ${err.detail || 'Error uploading file'}`);
    }
  } catch (err) {
    console.error("Upload error:", err);
  }
};

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {/* Dynamic Breadcrumbs */}
      <div className="max-w-6xl mx-auto mb-8 flex items-center gap-2 text-sm text-slate-400 font-medium">
        <button 
          onClick={() => { setSelectedDept(null); setSelectedSem(null); setSelectedSubject(null); setSelectedUnit(null); }}
          className="hover:text-indigo-400 transition"
        >
          Degree Programs
        </button>

        {selectedDept && (
          <>
            <span>/</span>
            <button 
              onClick={() => { setSelectedSem(null); setSelectedSubject(null); setSelectedUnit(null); }}
              className="hover:text-indigo-400 transition text-slate-200"
            >
              {selectedDept.code}
            </button>
          </>
        )}

        {selectedSem && (
          <>
            <span>/</span>
            <button 
              onClick={() => { setSelectedSubject(null); setSelectedUnit(null); }}
              className="hover:text-indigo-400 transition text-slate-200"
            >
              Semester {selectedSem.semester_number}
            </button>
          </>
        )}

        {selectedSubject && (
          <>
            <span>/</span>
            <button 
              onClick={() => setSelectedUnit(null)}
              className="hover:text-indigo-400 transition text-slate-200"
            >
              {selectedSubject.subject_code}
            </button>
          </>
        )}

        {selectedUnit && (
          <>
            <span>/</span>
            <span className="text-indigo-400 font-bold">Unit {selectedUnit.unit_number} Workspace</span>
          </>
        )}
      </div>

      <div className="max-w-6xl mx-auto">
        
        {/* LEVEL 1: DEGREE PROGRAM / DEPARTMENT */}
        {!selectedDept && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-black text-white">Select Your Degree Program</h1>
                <p className="text-slate-400 text-sm mt-1">Choose your academic department to access course materials.</p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => { setInputVal1(''); setInputVal2(''); setShowModal(true); }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/30"
                >
                  + Add Program (Admin)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {departments.map((dept) => (
                <div
                  key={dept.department_id}
                  onClick={() => handleSelectDept(dept)}
                  className="p-6 bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl cursor-pointer transition group"
                >
                  <span className="text-2xl font-mono font-bold text-indigo-400 block mb-2">{dept.code}</span>
                  <h3 className="text-lg font-bold group-hover:text-indigo-300 transition">{dept.name}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEVEL 2: SEMESTER SELECT */}
        {selectedDept && !selectedSem && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">{selectedDept.name} ({selectedDept.code})</h1>
                <p className="text-slate-400 text-sm mt-1">Select an active academic semester.</p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => { setInputVal1(''); setInputVal2('2025-2026'); setShowModal(true); }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/30"
                >
                  + Add Semester (Admin)
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {semesters.map((sem) => (
                <div
                  key={sem.semester_id}
                  onClick={() => handleSelectSem(sem)}
                  className="p-6 bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl cursor-pointer transition text-center"
                >
                  <span className="text-3xl font-extrabold text-indigo-400 block mb-1">Sem {sem.semester_number}</span>
                  <span className="text-xs text-slate-400">{sem.academic_year}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEVEL 3: SUBJECT SELECT */}
        {selectedSem && !selectedSubject && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Semester {selectedSem.semester_number} Subjects</h1>
                <p className="text-slate-400 text-sm mt-1">Select a subject course.</p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => { setInputVal1(''); setInputVal2(''); setShowModal(true); }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/30"
                >
                  + Add Subject (Admin)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {subjects.map((subj) => (
                <div
                  key={subj.subject_id}
                  onClick={() => handleSelectSubject(subj)}
                  className="p-6 bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl cursor-pointer transition"
                >
                  <span className="text-xs font-mono bg-indigo-950 text-indigo-400 px-2.5 py-1 rounded-md mb-3 inline-block font-bold">
                    {subj.subject_code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-100">{subj.title}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEVEL 4: UNIT SELECT */}
        {selectedSubject && !selectedUnit && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">{selectedSubject.title} Units</h1>
                <p className="text-slate-400 text-sm mt-1">Select a unit to view course materials or launch your personal workspace.</p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => { setInputVal1(''); setInputVal2(''); setShowModal(true); }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/30"
                >
                  + Add Unit (Admin)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {units.map((unit) => (
                <div
                  key={unit.unit_id}
                  onClick={() => handleSelectUnit(unit)}
                  className="p-6 bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block mb-1">Unit 0{unit.unit_number}</span>
                    <h3 className="text-lg font-semibold text-white">{unit.title}</h3>
                  </div>
                  <span className="px-4 py-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold">
                    Open Unit ➔
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEVEL 5: UNIT MATERIAL WORKSPACE & UPLOAD INTERFACE */}
        {selectedUnit && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-1">Unit 0{selectedUnit.unit_number}</span>
                <h1 className="text-2xl font-bold text-white">{selectedUnit.title}</h1>
              </div>

              {/* Action Button: Launch Dual Workspace */}
              <button
                onClick={() => router.push(`/workspace?unit_id=${selectedUnit.unit_id}&title=${encodeURIComponent(selectedUnit.title)}`)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                Launch Dual Workspace 🌊
              </button>
            </div>

            {/* TEACHER / ADMIN MATERIAL UPLOAD STRIP */}
            {isFaculty ? (
              <div className="p-6 bg-indigo-950/40 border border-indigo-800/50 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-indigo-300 mb-1">Faculty & Admin Ingestion Zone</h4>
                  <p className="text-xs text-slate-400">Upload slides, PDFs, or syllabus materials for students and vectorize them for Study Buddy AI.</p>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                >
                  + Upload Unit Material
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400 italic">
                🔒 Only assigned Faculty members and Administrators can add material to this unit.
              </div>
            )}

            {/* DOCUMENT LIST FOR ALL USERS */}
            {/* DOCUMENT LIST FOR ALL USERS */}
      {documents.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          No documents uploaded for this unit yet.
        </p>
      ) : (
        <div className="grid gap-3 mt-4">
          {documents.map((doc) => (
            <div key={doc.document_id} className="p-3 bg-slate-800 rounded flex justify-between items-center">
              <div>
                <p className="font-semibold text-white">{doc.file_name}</p>
                <span className="text-xs text-slate-400">{doc.upload_type}</span>
              </div>
              <a 
                href={doc.upload_type === 'link' ? doc.external_link : `http://localhost:8000/api/v1/classrooms/documents/${doc.document_id}/download`} 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-400 text-sm hover:underline"
              >
                {doc.upload_type === 'link' ? 'Open Link' : 'Download'}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
     )}
    </div>
      {/* ADMIN CREATION MODAL */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="text-xl font-bold text-white">
              {!selectedDept ? 'Add Department / Program' :
               !selectedSem ? 'Add Semester' :
               !selectedSubject ? 'Add Subject' : 'Add Unit'}
            </h3>
            <form onSubmit={handleAdminCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  {!selectedDept ? 'Code (e.g. CSE)' : !selectedSem ? 'Semester Number (e.g. 5)' : !selectedSubject ? 'Subject Code (e.g. CSE-501)' : 'Unit Number (e.g. 1)'}
                </label>
                <input
                  type="text"
                  required
                  value={inputVal1}
                  onChange={(e) => setInputVal1(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  {!selectedDept ? 'Full Name' : !selectedSem ? 'Academic Year (e.g. 2025-2026)' : !selectedSubject ? 'Subject Title' : 'Unit Title'}
                </label>
                <input
                  type="text"
                  required
                  value={inputVal2}
                  onChange={(e) => setInputVal2(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FACULTY MATERIAL UPLOAD MODAL */}
      {showUploadModal && isFaculty && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
      <h3 className="text-xl font-bold text-white">Upload Material for {selectedUnit?.title}</h3>
      
      {/* Upload Type Switcher */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setUploadType('device')}
          className={`flex-1 py-2 rounded-lg transition ${uploadType === 'device' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          💻 From Device
        </button>
        <button
          type="button"
          onClick={() => setUploadType('link')}
          className={`flex-1 py-2 rounded-lg transition ${uploadType === 'link' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          🔗 External Link
        </button>
      </div>

      <form onSubmit={handleFacultyUpload} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Document Display Title</label>
          <input
            type="text"
            required
            placeholder="e.g. Physical Layer Notes & Diagrams"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {uploadType === 'device' ? (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Select File (PDF, Slides, Doc)</label>
            <input
              type="file"
              required
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setSelectedFile(e.target.files[0]);
                  if (!fileName) setFileName(e.target.files[0].name);
                }
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">External Resource URL / Google Drive Link</label>
            <input
              type="url"
              required
              placeholder="https://drive.google.com/file/d/..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
          <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">Upload Material</button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
}