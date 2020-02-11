#include "STM32L1xx.h"

#define INS GPIOB->IDR & 0x0F;

uint8_t count = 0;
uint8_t dirps = 255;//255 for count, anything else for key value
uint8_t key = 0;
uint8_t qq = 0;
uint8_t lu[] = {1,4,7,0xE,2,5,8,0,3,6,9,0xF,0xA,0xB,0xC,0xD};
void delay_us(int delay) {
    TIM6->SR = 0;	
    TIM6->PSC =  4;
    TIM6->ARR = delay;
    TIM6->CNT = 0;
    TIM6->CR1 |= TIM_CR1_CEN;
    while (!(TIM6->SR & TIM_SR_UIF));
}
void display() {
	if(dirps == 255) { 
		GPIOC->ODR = count & 0x0F;
		return;
	}
	else if(count == dirps){ 
		dirps = 255;
		display();
		return;
	}
	GPIOC->ODR = key & 0x0F;	
}
void delay_ms(int delay) {
    TIM6->SR = 0;	
    TIM6->PSC =  4000;
    TIM6->ARR = delay;
    TIM6->CNT = 0;
    TIM6->CR1 |= TIM_CR1_CEN;
    while (!(TIM6->SR & TIM_SR_UIF));
}
uint8_t log_2(uint8_t num){
	uint8_t ret;
	for( ret = 0; num > 0; ret++){
		num = num >> 1;
	}
	return ret-1;
}
void countF(uint8_t *count,int num) {
    *count += num;
    if (*count >= 10) {
        *count -= 10;
    }
}
void EXTI0_IRQHandler(){
	for(char i = 0; i < 4; i++){
		GPIOB->ODR = 0x000000F0 & (~(0x10 << i));
		delay_ms(2);
		qq = INS;
		if(qq != 0xF) {
			key = lu[4*i + log_2((~qq)&0x0F)];
			dirps = count;
			countF(&dirps,5);
			break;
		}
	}
	GPIOB->ODR = 0x00000000;
	display();
	EXTI->PR = 0x00FFFFFF;
}
void pinSetup() {
    RCC->APB1ENR |= 0x00000010;
    RCC->AHBENR  |= 0x07;
    
	GPIOA->MODER = GPIOA->MODER & 0xFFFF0000;  

	GPIOB->MODER = 0x00005500;
	GPIOB->PUPDR = 0x00000055;

	GPIOC->MODER &= ~0xFFFFFFFF;
    GPIOC->MODER |=  0x55555555;
}
	
int main(void){
    
	SYSCFG->EXTICR[0] = 0;
	//EXTI->RTSR = 	0x00FFFFFF;
	EXTI->EMR = 	0x00000001; 
	EXTI->IMR = 	0x00000001;
	EXTI->FTSR = 	0x00000001;
	NVIC_EnableIRQ(EXTI0_IRQn);
	NVIC_ClearPendingIRQ(EXTI0_IRQn);  
	pinSetup();
	GPIOB->ODR = 0x00000000;
	__enable_irq();
    while(1) {
		delay_ms(500);
		countF(&count,1);
        display();
    }
}