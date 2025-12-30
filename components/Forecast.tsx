import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { projectService } from '../src/api/services/projectService';
import { TrendingUp, Calendar, Package, Search } from 'lucide-react';

interface Props {
  projects: Project[];
}

const Forecast: React.FC<Props> = ({ projects }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

  useEffect(() => {
    const filtered = projects.filter(project => {
      const matchesSearch = 
        project.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.carModel.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
    setFilteredProjects(filtered);
  }, [projects, searchTerm]);

  const getVolumeForYear = (project: Project, year: number): number => {
    const volumeKey = `volume${year}` as keyof Project;
    return (project[volumeKey] as number) || 0;
  };

  const getTotalVolumeForYear = (year: number): number => {
    return filteredProjects.reduce((sum, project) => sum + getVolumeForYear(project, year), 0);
  };

  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <TrendingUp className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">아이템별 Forecast</h2>
              <p className="text-sm text-slate-500 mt-1">프로젝트별 연도별 생산량 예측</p>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="부품명, 부품번호, 고객사명, 차종으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="text-slate-400" size={20} />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none bg-white"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Forecast 테이블 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-6 py-4 text-left text-sm font-bold sticky left-0 bg-slate-900 z-10">부품명</th>
                <th className="px-6 py-4 text-left text-sm font-bold">부품번호</th>
                <th className="px-6 py-4 text-left text-sm font-bold">고객사명</th>
                <th className="px-6 py-4 text-left text-sm font-bold">차종</th>
                {years.map(year => (
                  <th key={year} className={`px-6 py-4 text-center text-sm font-bold ${selectedYear === year ? 'bg-indigo-600' : ''}`}>
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={4 + years.length} className="px-6 py-12 text-center text-slate-400">
                    <Package className="mx-auto mb-3 opacity-20" size={48} />
                    <p className="font-bold">검색 결과가 없습니다</p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 sticky left-0 bg-white z-10">{project.partName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{project.partNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{project.customerName}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{project.carModel}</td>
                    {years.map(year => {
                      const volume = getVolumeForYear(project, year);
                      return (
                        <td key={year} className={`px-6 py-4 text-center text-sm font-bold ${selectedYear === year ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}>
                          {volume.toLocaleString()}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
              {/* 합계 행 */}
              {filteredProjects.length > 0 && (
                <tr className="bg-slate-900 text-white font-black">
                  <td colSpan={4} className="px-6 py-4 text-sm sticky left-0 bg-slate-900 z-10">합계</td>
                  {years.map(year => {
                    const total = getTotalVolumeForYear(year);
                    return (
                      <td key={year} className={`px-6 py-4 text-center text-sm ${selectedYear === year ? 'bg-indigo-600' : ''}`}>
                        {total.toLocaleString()}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Forecast;

