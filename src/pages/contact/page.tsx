import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';
import { supabase } from '../../lib/supabase';

export default function ContactPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.message.length > 500) return;
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const form = e.currentTarget;
      const formDataToSend = new FormData(form);
      
      const response = await fetch('https://readdy.ai/api/form/d6op0i3lgirdouph2vig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formDataToSend as any).toString()
      });

      if (response.ok) {
        try {
          await supabase.from('contact_messages').insert({
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Failed to save message:', err);
        }
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <SiteHeader activePage="contact" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('contact.title')}</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('contact.subtitle')}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('contact.sendMessage')}</h2>
              
              <form id="contact_form" data-readdy-form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contact.name')} <span className="text-red-500">{t('contact.required')}</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all text-sm"
                      placeholder={t('contact.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contact.email')} <span className="text-red-500">{t('contact.required')}</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all text-sm"
                      placeholder={t('contact.emailPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('contact.subject')} <span className="text-red-500">{t('contact.required')}</span>
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all text-sm cursor-pointer"
                  >
                    <option value="">{t('contact.selectSubject')}</option>
                    <option value="draw">{t('contact.subject.draw')}</option>
                    <option value="points">{t('contact.subject.points')}</option>
                    <option value="prize">{t('contact.subject.prize')}</option>
                    <option value="account">{t('contact.subject.account')}</option>
                    <option value="tech">{t('contact.subject.tech')}</option>
                    <option value="coop">{t('contact.subject.coop')}</option>
                    <option value="other">{t('contact.subject.other')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('contact.message')} <span className="text-red-500">{t('contact.required')}</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    maxLength={500}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all text-sm resize-none"
                    placeholder={t('contact.messagePlaceholder')}
                  ></textarea>
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {formData.message.length} / 500
                  </div>
                </div>

                {submitStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                    <i className="ri-checkbox-circle-fill text-green-600 text-xl"></i>
                    <div>
                      <p className="text-green-800 font-medium">{t('contact.success')}</p>
                      <p className="text-green-700 text-sm mt-1">{t('contact.successDesc')}</p>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <i className="ri-error-warning-fill text-red-600 text-xl"></i>
                    <div>
                      <p className="text-red-800 font-medium">{t('contact.sendFail')}</p>
                      <p className="text-red-700 text-sm mt-1">{t('contact.sendFailDesc')}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || formData.message.length > 500}
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 px-6 rounded-lg font-medium hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 whitespace-nowrap cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      <span>{t('contact.sending')}</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-fill"></i>
                      <span>{t('contact.submit')}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                  <i className="ri-customer-service-2-fill text-rose-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{t('contact.service')}</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <i className="ri-mail-fill text-gray-400 mt-0.5"></i>
                  <div>
                    <p className="text-gray-600 mb-1">Email</p>
                    <a href="mailto:cardtrain@ct-vest.com" className="text-rose-500 hover:text-rose-600 font-medium cursor-pointer">
                      cardtrain@ct-vest.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="ri-time-fill text-gray-400 mt-0.5"></i>
                  <div>
                    <p className="text-gray-600 mb-1">{t('contact.replyTime')}</p>
                    <p className="text-gray-900">{t('contact.replyHours')}</p>
                    <p className="text-gray-500 text-xs mt-1">{t('contact.reply24h')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <i className="ri-share-fill text-pink-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{t('contact.followUs')}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">{t('contact.followDesc')}</p>
              <div className="space-y-3">
                <a href="https://www.instagram.com/card.train/" target="_blank" rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-rose-50 transition-all group cursor-pointer">
                  <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <i className="ri-instagram-fill text-white text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 group-hover:text-rose-500 transition-colors">Instagram</p>
                    <p className="text-xs text-gray-500">@card.train</p>
                  </div>
                  <i className="ri-arrow-right-line text-gray-400 group-hover:text-rose-500 transition-colors"></i>
                </a>
                <a href="https://www.youtube.com/@CardTrain" target="_blank" rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 transition-all group cursor-pointer">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <i className="ri-youtube-fill text-white text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 group-hover:text-red-500 transition-colors">YouTube</p>
                    <p className="text-xs text-gray-500">@CardTrain</p>
                  </div>
                  <i className="ri-arrow-right-line text-gray-400 group-hover:text-red-500 transition-colors"></i>
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl p-6 text-white">
              <div className="flex items-center space-x-3 mb-3">
                <i className="ri-question-answer-fill text-2xl"></i>
                <h3 className="text-lg font-bold">{t('contact.faq')}</h3>
              </div>
              <p className="text-white/90 text-sm mb-4">{t('contact.faqDesc')}</p>
              <Link
                to="/guide"
                className="inline-flex items-center space-x-2 bg-white text-rose-500 px-4 py-2 rounded-lg font-medium hover:bg-rose-50 transition-all whitespace-nowrap cursor-pointer"
              >
                <span>{t('contact.viewFaq')}</span>
                <i className="ri-arrow-right-line"></i>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}