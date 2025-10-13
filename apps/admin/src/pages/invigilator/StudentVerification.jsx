import { useEffect, useRef, useState } from 'react';
import useScannerStore from "../../store/useScannerStore";
import { useNavigate } from 'react-router-dom';

import { auth, firestore } from "../../../../../shared/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

import Human from '@vladmandic/human'; 
import { openDB } from 'idb';

import Logo from '../../assets/eps-white.png'; 


const StudentVerification = () => {

    const [sessionId, setSessionId] = useState(useScannerStore((state) => state.selectedExamSessionId));
    const [isAuthorized, setIsAuthorized] = useState(false);
    const navigate = useNavigate();

    const messagesEndRef = useRef(null);
    const [human, setHuman] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    console.log("Session ID in StudentVerification: ", sessionId);

    document.title = "EPS - Student Verification";

    /** IndexedDB for staging */
    const initDB = async () => {
    return openDB('studentVerification', 1, {
        upgrade(db) {
        if (!db.objectStoreNames.contains('stagedData')) {
            db.createObjectStore('stagedData');
        }
        },
    });
    };

    /** Helper for updating UI messages */
    const pushMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
    // Auto-scroll to bottom after message is added
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    };

    // get session data from the sessionID
    // use the session data to get the room ID

    const fetchSessionData = async (sessionId) => {}

    // get courses available in that session through examSessionCourses collections
    // use fetched course IDs to get student list registered for those courses from StudentCourseRegistrations collection
    const fetchRegisteredStudents = async (courseIds) => {}

    // use sessionID to get the invigilator assigned to that session from examSessionInvigilators collection
    // if current user is not the assigned invigilator, show error message and do not allow scanning
    // else proceed to scanning
    const fetchAssignedInvigilator = async (sessionId) => {}

    // Below add scanning logic, comparing embeddings, staging results to IndexedDB etc.
    useEffect(() => {}, []);


    if(!sessionId) return(
        <div className="flex flex-col gap-2 items-center justify-center h-screen p-4">
            <h2 className="text-2xl text-red-400 text-center font-bold max-w-md">Something went wrong</h2>
            <p className="text-sm text-red-400 text-center max-w-md">Please check your internet connection and try again.</p>
            <button className="btn-primary mt-4" onClick={() => {navigate('/invigilator/scanner')}}>Go Back</button>
        </div>
    )
    if(!isAuthorized) return(
        <div className="flex flex-col gap-2 items-center justify-center h-screen p-4">
            <h2 className="text-2xl text-red-400 text-center font-bold max-w-md">Unauthorized Access</h2>
            <p className="text-sm text-red-400 text-center max-w-md">You are not authorized to access this room. Go to assigned room or Contact admin</p>
            <button className="btn-primary mt-4" onClick={() => {navigate('/invigilator/scanner')}}>Go Back</button>
        </div>
    )
    return (
        <>

          <div>
            {/* push messages to show scanner ready or put face well, failed to load ...etc */}
                {/* Messages Display - Fixed Height with Auto-scroll */}
                <div className="mx-auto max-w-md w-full">
                    <div className="h-12 overflow-y-auto bg-gray-50 border border-gray-200  p-3 text-sm">
                    {messages.map((m, idx) => (
                        <p key={idx} className="mb-2 last:mb-0 text-center">{m}</p>
                    ))}
                    <div ref={messagesEndRef} />
                    </div>
                </div>
          </div>

          <div>
            {/* video stream with scan button */}
          </div>

          <div>
            {/* Show this element and hide video stream,  */}
            {/* 1. show student ID, fullname, program and 'Verified' badge if embedding matched*/}
            {/* 2. show student id input field after first fail so you can narrow the embedding to compare against, if success show step 1. above */}
            {/* else show failed message and advise to proceed with next student, resolve these mismatches at the end of the scanning. */}
          </div>
    
        </>
    )
}

export default StudentVerification;