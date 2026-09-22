"use client";
import React from 'react';
import Navbar from "@/components/navigationBar";
import { useCallback, useEffect, useRef, useState } from "react";
import CountyDirectory from "@/components/Countydirectory";
import Footer from '@/components/footer';

export default function ExploreByCountyPage() {
    return (
        <div>
            <Navbar />
            <CountyDirectory />
            <Footer />
        </div>
    );
}